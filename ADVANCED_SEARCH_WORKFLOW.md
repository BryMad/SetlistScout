# SetlistScout Advanced Search Workflow - Complete Technical Documentation

## Overview

The advanced search feature allows users to search for historical tours by any artist. This document details every function call, decision point, and process flow in the system.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│ Redis Cache  │     │  Scraper    │
│  (React)    │◀────│  (Express)  │◀────│              │     │  Service    │
└─────────────┘     └─────────────┘     └──────────────┘     │  (Vercel)   │
                            │                                  └─────────────┘
                            │                                         ▲
                            └────────────────────────────────────────┘
```

## MusicBrainz Artist Validation

MusicBrainz validation is a critical step that ensures accurate artist matching, particularly important for:
- Artists with similar names
- Tribute bands vs original artists
- Artists with special characters or diacritics
- Ensuring setlist.fm queries use the correct artist identity

The validation occurs AFTER the user selects an artist but BEFORE any tour data is fetched.

## Complete Function Flow

### 1. Frontend: User Initiates Advanced Search

**File**: `frontend/src/components/UserInput.jsx`

#### Function Call Sequence:

1. **User clicks "Past Tours" tab**
   ```javascript
   // UserInput.jsx:85
   <Tab>Past Tours</Tab>
   ```

2. **User types artist name**
   ```javascript
   // UserInput.jsx:147
   handleInputChange(e) {
     setInputValue(e.target.value);
     fetchSuggestions(e.target.value);
   }
   ```

3. **Fetch artist suggestions from Deezer**
   ```javascript
   // UserInput.jsx:208-220
   fetchSuggestions(query) {
     if (query.length < 2) return;
     
     const response = await axios.get(
       `/setlist/artist_search_deezer?q=${query}`
     );
     setSuggestions(response.data);
   }
   ```

4. **User selects artist**
   ```javascript
   // UserInput.jsx:235-251
   handleSelectSuggestion(artist) {
     setSelectedArtist(artist);
     setInputValue(artist.name);
     setSuggestions([]);
     
     if (selectedTab === 1) { // Past Tours tab
       fetchTours(artist.name);
     }
   }
   ```

5. **Fetch all tours for artist**
   ```javascript
   // UserInput.jsx:253-268
   async fetchTours(artistName) {
     setIsLoadingTours(true);
     
     const response = await axios.get(
       `/setlist/artist/${encodeURIComponent(artistName)}/tours`
     );
     
     setTours(response.data.tours);
     setIsLoadingTours(false);
   }
   ```

### 2. Backend: Tour Fetching Process

**File**: `backend/routes/setlistRoutes.js`

#### Route: `/setlist/artist/:artistId/tours`

```javascript
// setlistRoutes.js:508-615
router.get('/artist/:artistId/tours', async (req, res) => {
```

#### Function Call Flow:

1. **Initialize Tour Cache**
   ```javascript
   // Line 580
   const tourCache = new TourCache(req.app.locals.redisClient);
   ```

2. **Track artist search for popularity**
   ```javascript
   // Line 583
   await tourCache.trackArtistSearch(artistName);
   ```

3. **MusicBrainz Artist Validation**
   ```javascript
   // Line 585-628
   let mbid = null;
   let validatedArtistName = artistName;
   let useExactMatch = false;
   
   try {
     // Fetch MusicBrainz data using artist URL
     const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
     
     // Extract MusicBrainz artist name and ID
     const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]
                            ?.relations?.[0]?.artist?.name;
     mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]
              ?.relations?.[0]?.artist?.id;
     
     // Validate artist name match
     const nameMatch = isArtistNameMatch(artistName, mbArtistName);
     
     if (mbArtistName && nameMatch) {
       // Use canonical MusicBrainz name for accurate matching
       validatedArtistName = mbArtistName;
       useExactMatch = true;
     }
   } catch (error) {
     // Continue with original artist name if validation fails
     devLogger.error('musicbrainz', 'Validation error', error);
   }
   ```

4. **Get artist slug using validated information**
   ```javascript
   // Line 637-650
   let artistSlug = await tourCache.getCachedSlug(
     validatedArtistName, 
     mbid
   );
   
   if (!artistSlug) {
     // Extract slug from setlist.fm API
     artistSlug = await extractSetlistSlug(
       validatedArtistName, 
       useExactMatch, 
       mbid
     );
   }
   ```

5. **Check cache first**
   ```javascript
   // Line 528
   const cachedData = await tourCache.getCachedTours(artistSlug);
   ```

6. **Decision Point: Cache Hit or Miss**

   **Path A: Cache Hit (Recent)**
   ```javascript
   // Line 531-538
   if (cachedData && tourCache.shouldUseCache(cachedData)) {
     console.log(`Returning cached tours for: ${artistName}`);
     return res.json({
       artist: artistName,
       tours: cachedData.tours,
       cached: true,
       cacheAge: Date.now() - cachedData.cachedAt
     });
   }
   ```

   **Path B: Cache Miss or Stale**
   ```javascript
   // Line 541-543
   let freshData = cachedData;
   const currentTourCount = cachedData ? cachedData.tours.length : 0;
   ```

7. **Check if new tours exist (API call)**
   ```javascript
   // Line 546-559
   const latestSetlist = await getLatestSetlistForArtist(artistSlug);
   
   if (latestSetlist && latestSetlist.tour && latestSetlist.tour.name) {
     const latestTourName = latestSetlist.tour.name;
     const hasNewTour = !cachedData || 
       !cachedData.tours.some(tour => 
         tour.name === latestTourName
       );
   }
   ```

8. **Decision Point: New Tour Detected**

   **Path A: New Tour Found - Fetch All Tours**
   ```javascript
   // Line 564-574
   if (hasNewTour || !cachedData) {
     freshData = await fetchToursFromService(artistSlug, validatedArtistName);
     
     if (freshData && freshData.tours.length > 0) {
       await tourCache.cacheTours(artistSlug, freshData.tours);
     }
   }
   ```

   **Path B: No New Tour - Update Timestamp Only**
   ```javascript
   // Line 576-578
   else {
     await tourCache.updateLastChecked(artistSlug);
   }
   ```

9. **Return Response**
   ```javascript
   // Line 592-608
   res.json({
     artist: artistName,
     tours: toursToReturn,
     cached: false,
     tourCount: toursToReturn.length,
     ...(freshData && {
       originalCount: freshData.originalCount,
       filteredCount: freshData.filteredCount
     })
   });
   ```

### 3. Backend: MusicBrainz Validation Functions

**File**: `backend/utils/musicBrainzChecks.js`

```javascript
// musicBrainzChecks.js:11-28
function isArtistNameMatch(spotifyName, mbName) {
  if (!spotifyName || !mbName) return false;
  
  // Normalize strings (lowercase, remove diacritics)
  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizedSpotify = normalize(spotifyName);
  const normalizedMB = normalize(mbName);

  // Check exact match or partial inclusion
  return (
    normalizedSpotify === normalizedMB ||
    normalizedSpotify.includes(normalizedMB) ||
    normalizedMB.includes(normalizedSpotify)
  );
}
```

**File**: `backend/utils/musicBrainzAPIRequests.js`

```javascript
// Fetches MusicBrainz artist data from Deezer/Spotify URL
async function fetchMBIdFromSpotifyId(artistUrl) {
  // Makes API call to MusicBrainz to get artist data
  // Returns artist name and MBID for validation
}
```

### 4. Backend: Scraper Service Communication

**Function**: `fetchToursFromService(slug, artistName)`
**File**: `backend/routes/setlistRoutes.js:25-64`

```javascript
async function fetchToursFromService(slug, artistName) {
  try {
    // 1. Make HTTP request to scraper service
    const response = await axios.get(
      `${process.env.SCRAPER_SERVICE_URL}/api/tours/${slug}`,
      {
        headers: {
          'X-API-Key': process.env.SCRAPER_API_KEY
        },
        timeout: 30000
      }
    );
    
    // 2. Return tour data
    return response.data;
    
  } catch (error) {
    // 3. Error handling paths
    console.error(`Error fetching tours: ${error.message}`);
    return { tours: [], error: error.message };
  }
}
```

### 4. Scraper Service: Tour Scraping

**File**: `scraper-service/api/tours/[slug].js`

#### Function Flow:

1. **Vercel Function Entry**
   ```javascript
   // [slug].js:1-50
   export default async function handler(req, res) {
   ```

2. **API Key Validation**
   ```javascript
   // Line 10-16
   const apiKey = req.headers['x-api-key'];
   if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
     return res.status(401).json({ 
       error: 'Unauthorized' 
     });
   }
   ```

3. **Extract slug parameter**
   ```javascript
   // Line 18
   const { slug } = req.query;
   ```

4. **Call scraper function**
   ```javascript
   // Line 25
   const tours = await scrapeTours(slug);
   ```

5. **Return scraped data**
   ```javascript
   // Line 31-35
   res.status(200).json({
     tours,
     scrapedAt: new Date().toISOString(),
     originalCount: tours.length,
     filteredCount: tours.length
   });
   ```

**File**: `scraper-service/tourScraper.js`

#### Scraping Function:

```javascript
// tourScraper.js:3-80
async function scrapeTours(artistSlug) {
  // 1. Fetch HTML from setlist.fm
  const response = await axios.get(
    `https://www.setlist.fm/setlists/${artistSlug}`,
    { timeout: 15000 }
  );
  
  // 2. Parse HTML with Cheerio
  const $ = cheerio.load(response.data);
  
  // 3. Extract tour data
  const tours = [];
  $('.tour-name').each((index, element) => {
    const tourName = $(element).text().trim();
    const showCount = extractShowCount(element);
    
    tours.push({
      name: tourName,
      showCount: showCount || 0
    });
  });
  
  // 4. Filter invalid tours
  return filterValidTours(tours);
}
```

### 5. Backend: Tour Cache Management

**File**: `backend/utils/tourCache.js`

#### Key Functions:

1. **Get Cached Tours**
   ```javascript
   // tourCache.js:15-30
   async getCachedTours(artistSlug) {
     const key = this.getTourKey(artistSlug);
     const cached = await this.redis.get(key);
     return cached ? JSON.parse(cached) : null;
   }
   ```

2. **Should Use Cache Decision**
   ```javascript
   // tourCache.js:32-57
   shouldUseCache(cachedData) {
     const now = Date.now();
     const lastChecked = cachedData.lastChecked || 
                        cachedData.cachedAt;
     const timeSinceCheck = now - lastChecked;
     
     // Decision tree based on cache age
     const ageInDays = (now - cachedData.cachedAt) / 
                       (1000 * 60 * 60 * 24);
     
     if (ageInDays < 7) {
       return timeSinceCheck < 6 * 60 * 60 * 1000; // 6 hours
     } else if (ageInDays < 30) {
       return timeSinceCheck < 24 * 60 * 60 * 1000; // 1 day
     } else if (ageInDays < 180) {
       return timeSinceCheck < 7 * 24 * 60 * 60 * 1000; // 1 week
     } else {
       return timeSinceCheck < 30 * 24 * 60 * 60 * 1000; // 1 month
     }
   }
   ```

3. **Cache Tours**
   ```javascript
   // tourCache.js:59-82
   async cacheTours(artistSlug, tours) {
     const validTours = this.filterInvalidTours(tours);
     
     const cacheData = {
       tours: validTours,
       lastUpdated: new Date().toISOString(),
       lastChecked: Date.now(),
       cachedAt: Date.now(),
       originalCount: tours.length,
       filteredCount: validTours.length
     };
     
     await this.redis.setex(
       this.getTourKey(artistSlug),
       this.CACHE_TTL,
       JSON.stringify(cacheData)
     );
   }
   ```

### 6. Frontend: User Selects Tour

**File**: `frontend/src/components/UserInput.jsx`

#### Function Flow:

1. **Display tour dropdown**
   ```javascript
   // UserInput.jsx:328-346
   {selectedTab === 1 && tours.length > 0 && (
     <Select
       placeholder="Select a tour"
       value={selectedTour}
       onChange={(e) => setSelectedTour(e.target.value)}
     >
       {tours.map((tour, index) => (
         <option key={index} value={tour.name}>
           {tour.name} ({tour.showCount} shows)
         </option>
       ))}
     </Select>
   )}
   ```

2. **User clicks "Get Setlist"**
   ```javascript
   // UserInput.jsx:355-371
   handleSubmit() {
     if (selectedTab === 1 && selectedTour) {
       // Advanced search with specific tour
       performSearch(selectedArtist, selectedTour);
     }
   }
   ```

### 7. Backend: Process Specific Tour

**File**: `backend/routes/setlistRoutes.js`

#### Route: `/setlist/search_tour_with_updates`

```javascript
// setlistRoutes.js:429-506
router.get('/search_tour_with_updates', 
  establishSSEConnection, 
  async (req, res) => {
```

#### Function Flow:

1. **Extract parameters**
   ```javascript
   // Line 432-433
   const { artistName, tourName } = req.query;
   const sseManager = req.sseManager;
   ```

2. **Process tour with SSE updates**
   ```javascript
   // Line 443-502
   const results = await processSpecificTourWithUpdates(
     artistName, 
     tourName, 
     sseManager
   );
   ```

### 8. Backend: Background Cache Updates

**File**: `backend/utils/backgroundCacheUpdate.js`

#### Triggered After Live Shows:

```javascript
// setlistRoutes.js:196 (in processArtistWithUpdates)
BackgroundCacheUpdater.triggerUpdate(
  redisClient, 
  artistName
);
```

#### Update Flow:

1. **Check if artist is already cached**
   ```javascript
   // backgroundCacheUpdate.js:10-25
   static async triggerUpdate(redisClient, artistName) {
     const slug = await extractSetlistSlug(artistName);
     const tourCache = new TourCache(redisClient);
     const existingCache = await tourCache.getCachedTours(slug);
     
     if (!existingCache) {
       // Don't create new cache from basic search
       return;
     }
   }
   ```

2. **Check for new tours**
   ```javascript
   // backgroundCacheUpdate.js:28-45
   setTimeout(async () => {
     const latestSetlist = await getLatestSetlistForArtist(slug);
     
     if (hasNewTour) {
       const freshData = await fetchToursFromService(slug, artistName);
       await tourCache.cacheTours(slug, freshData.tours);
     }
   }, 5000); // 5 second delay
   ```

## Decision Trees

### MusicBrainz Validation Flow
```
User selects artist
    │
    ├─▶ Fetch MusicBrainz data using artist URL
    │      │
    │      ├─▶ Success: Extract MB artist name & ID
    │      │      │
    │      │      └─▶ Name match check
    │      │             │
    │      │             ├─▶ Match: Use MB canonical name
    │      │             │
    │      │             └─▶ No match: Use original name
    │      │
    │      └─▶ Failure: Use original artist name
    │
    └─▶ Continue with validated artist info
```

### Cache Decision Flow
```
User requests tours (with validated artist)
    │
    ├─▶ Check cached slug exists?
    │      │
    │      ├─▶ YES: Use cached slug
    │      │
    │      └─▶ NO: Extract slug from setlist.fm API
    │
    ├─▶ Check tour cache exists?
    │      │
    │      ├─▶ NO: Fetch from scraper
    │      │
    │      └─▶ YES: Is cache recent?
    │             │
    │             ├─▶ YES: Return cached data
    │             │
    │             └─▶ NO: Check for new tours
    │                    │
    │                    ├─▶ New tour found: Fetch all
    │                    │
    │                    └─▶ No new tour: Use cache
    │
    └─▶ Return response
```

### Error Handling Paths
```
Scraper request
    │
    ├─▶ Success: Cache and return data
    │
    └─▶ Failure: 
           │
           ├─▶ Cache exists: Return stale cache
           │
           └─▶ No cache: Return empty array
```

## Key Functions Summary

### Frontend Functions
- `handleInputChange()` - Triggers artist search
- `fetchSuggestions()` - Gets Deezer suggestions
- `handleSelectSuggestion()` - Handles artist selection
- `fetchTours()` - Gets all tours for artist
- `handleSubmit()` - Initiates tour processing

### Backend Functions
- `fetchMBIdFromSpotifyId()` - Gets MusicBrainz data from artist URL
- `isArtistNameMatch()` - Validates artist name matches
- `extractSetlistSlug()` - Gets artist slug from API
- `tourCache.getCachedSlug()` - Checks for cached artist slug
- `tourCache.trackArtistSearch()` - Records popularity metrics
- `tourCache.getCachedTours()` - Retrieves cached data
- `tourCache.shouldUseCache()` - Cache freshness logic
- `getLatestSetlistForArtist()` - Checks for new tours
- `fetchToursFromService()` - Calls scraper service
- `tourCache.cacheTours()` - Stores tour data
- `processSpecificTourWithUpdates()` - Processes selected tour

### Scraper Service Functions
- `handler()` - Vercel function endpoint
- `scrapeTours()` - Main scraping logic
- `filterValidTours()` - Removes invalid tours

### Cache Management Functions
- `BackgroundCacheUpdater.triggerUpdate()` - Background updates
- `tourCache.updateLastChecked()` - Updates timestamp
- `tourCache.filterInvalidTours()` - Data cleaning

## Environment Variables

### Backend (.env)
```
SCRAPER_SERVICE_URL=https://your-scraper.vercel.app
SCRAPER_API_KEY=your-api-key
REDIS_URL=redis://localhost:6379
```

### Frontend (.env)
```
VITE_ENABLE_ADVANCED_SEARCH=true
VITE_SERVER_URL=http://localhost:5001
```

### Scraper Service (.env)
```
SCRAPER_API_KEY=same-as-backend
ALLOWED_ORIGINS=*
```

## Performance Optimizations

1. **Cache-First Architecture**: Always check cache before external calls
2. **Smart Update Logic**: Only scrape when new tours detected
3. **Background Updates**: Cache updates happen after user gets response
4. **Invalid Tour Filtering**: Clean data before caching
5. **Graceful Degradation**: Returns stale cache if scraper fails
6. **API Rate Limiting**: Respects external service limits

## Security Measures

1. **API Key Protection**: Scraper requires authentication
2. **CORS Configuration**: Restricts allowed origins
3. **Request Validation**: Validates all input parameters
4. **Error Sanitization**: Never exposes internal errors
5. **Timeout Protection**: 30-second timeout on scraper calls

## Monitoring Points

### Backend Logs
- "Fetching fresh tours for: [Artist]"
- "Returning cached tours for: [Artist]"
- "New tour detected: [Tour Name]"
- "Background cache update starting"

### Cache Metrics
- Cache hit/miss ratio
- Average cache age
- Update frequency
- Filtered tour count

### Error Tracking
- Scraper service failures
- API timeout events
- Cache operation errors
- Invalid tour detections