# State Management & Performance Solution

**Date:** 2025-12-01
**Problem:** Large setlists (up to 300 songs) require long Spotify lookups. All data stored in React state. Refreshing/navigating away loses progress and requires re-processing. No way to share results between users.

---

## The Core Problem

**300-song Spotify lookups can take minutes, everything lives in React state, and refreshing/navigating away loses all progress.** This creates a fragile UX where users can get stuck in infinite loading loops.

### Current Pain Points:
- ✗ Long Spotify API lookups (300 songs × 200ms = 60+ seconds)
- ✗ Refresh loses all progress
- ✗ No result sharing between users
- ✗ Redundant API calls for same artist/tour
- ✗ URL doesn't reflect current state
- ✗ Navigation resets everything

---

## Proposed Solution: Result Permalinks + Progressive Server-Side Caching

Multi-layered approach leveraging existing Redis infrastructure:

---

### **Layer 1: Completed Result Caching**
**Solves:** Sharing, Instant Re-access

Cache completed setlist results in Redis with permanent URLs:

```
Key Format: setlist_result:{mbid}:{tourName_hash}
TTL: 30 days
Data: {
  artistName, tourName, showCount,
  songs: [ {name, artist, playCount, spotifyId, albumArt, ...} ],
  generatedAt, resultId
}
```

**Result Permalink Flow:**
1. User searches "Phish" → Processing starts
2. When complete, generate short UUID: `abc123`
3. Store full results in Redis: `result:abc123`
4. Update URL to `/results/abc123` (React Router v7 supports this)
5. User can share link, refresh safely, bookmark

**Benefits:**
- ✅ Shareable URLs between users
- ✅ Refresh-safe (hydrate from server)
- ✅ No re-processing for repeat searches
- ✅ Instant load for shared links

---

### **Layer 2: Progressive Job Tracking**
**Solves:** Resume After Refresh

Track in-progress Spotify lookups server-side:

```
Key Format: job:{sessionId}:{searchTimestamp}
TTL: 1 hour
Data: {
  status: 'processing',
  artistMbid, tourName,
  totalSongs: 300,
  processedSongs: 147,  ← Progress tracking
  results: [...],       ← Partial results
  spotifyLookups: {...} ← Already-found Spotify IDs
}
```

**Resume Flow:**
1. User starts search → Backend creates `job:session123:timestamp`
2. As each Spotify lookup completes, update job cache
3. SSE sends progress updates: "147/300 songs found"
4. **User refreshes** → Frontend calls `/job/:jobId/status`
5. Backend returns partial results + continues processing
6. Frontend displays partial results immediately

**Benefits:**
- ✅ Partial progress survives refresh
- ✅ Users see songs appearing incrementally
- ✅ No starting from zero on refresh
- ✅ Can even resume from different device (same session)

---

### **Layer 3: Setlist + Spotify Cache**
**Solves:** Redundant API Calls

Cache Spotify lookup results separately:

```
Key Format: spotify_track:{artist_name}_{song_name}
TTL: 90 days (songs don't change)
Data: { spotifyId, albumArt, uri, ... }
```

**Deduplication Flow:**
1. Setlist has 300 songs, but many artists repeat songs across tours
2. Before Spotify API call, check `spotify_track:phish_tweezer`
3. Cache hit = instant, cache miss = call API + store
4. Dramatically reduces Spotify API calls for popular artists

**Benefits:**
- ✅ Faster processing (most songs already cached)
- ✅ Reduces Spotify API rate limiting issues
- ✅ Benefits all users across all searches

---

### **Layer 4: URL Structure Redesign**

Migrate from state-based to URL-based routing:

```
Current: / (everything in React state)

Proposed:
/                              → Home/search
/artist/{mbid}                 → Artist info (optional)
/results/{resultId}            → Completed results (shareable!)
/job/{jobId}                   → In-progress job (can refresh)
```

**Implementation:**
- Use React Router v7's `loader` functions to fetch data server-side
- URL encodes what user is viewing, not dependent on state
- Frontend becomes "view layer" for server data

---

## Implementation Strategy

### **Phase 1: Result Permalinks**
**Priority:** HIGH
**Effort:** 2-3 hours
**Impact:** 🔥 Huge UX win

**Backend changes:**
1. Create `/results/:resultId` GET endpoint
2. After setlist processing completes, generate UUID and store in Redis
3. Return `resultId` in final SSE message or response

**Frontend changes:**
1. When results complete, navigate to `/results/:resultId`
2. Add route handler that fetches from backend
3. Share button copies URL to clipboard

**Redis utilities:**
1. Create `resultCacheManager.js` (similar to `tourCacheManager.js`)
2. Store/retrieve logic with 30-day TTL

**Files to modify:**
- `backend/routes/setlistRoutes.js` - Add `/results/:resultId` endpoint
- `backend/utils/resultCacheManager.js` - New file for result storage
- `frontend/src/api/setlistService.js` - Add `getResultById()` method
- `frontend/src/App.jsx` - Add route for `/results/:resultId`
- `frontend/src/pages/Results.jsx` - New page component (or modify existing)

---

### **Phase 2: Progressive Job Tracking**
**Priority:** MEDIUM
**Effort:** 4-6 hours
**Impact:** Resilient long-running searches

**Backend changes:**
1. Modify setlist processing to update job cache incrementally
2. Create `/job/:jobId/status` endpoint for resume
3. Return jobId when processing starts

**SSE enhancements:**
1. Send `jobId` in first SSE message
2. Store jobId in URL: `/job/:jobId` or query param
3. Frontend subscribes to SSE using jobId

**Resume logic:**
1. On page load, check if URL has jobId
2. Call status endpoint, display partial results
3. Reconnect to SSE for remaining updates

**Files to modify:**
- `backend/utils/setlistAPIRequests.js` - Add incremental job caching
- `backend/utils/jobCacheManager.js` - New file for job tracking
- `backend/routes/setlistRoutes.js` - Add `/job/:jobId/status` endpoint
- `backend/utils/sseManager.js` - Enhance with jobId support
- `frontend/src/context/SetlistContext.jsx` - Add job tracking state

---

### **Phase 3: Spotify Track Caching**
**Priority:** HIGH
**Effort:** 1-2 hours
**Impact:** 🚀 Major performance boost

**Backend changes:**
1. Wrap Spotify API calls with cache check
2. Key: normalized `artist_song` string
3. 90-day TTL (songs rarely change)

**Cache warming:**
1. Popular artists will naturally warm cache
2. Optional: Pre-cache top 100 toured artists

**Files to modify:**
- `backend/utils/spotifyAPIRequests.js` - Add cache layer
- `backend/utils/spotifyTrackCache.js` - New file for track caching

---

## Architecture Diagram

```
User searches "Phish"
    ↓
Backend creates job:session123
    ↓
Check setlist_result cache (instant if exists)
    ↓
Fetch setlists from Setlist.fm
    ↓
For each song:
  - Check spotify_track cache
  - If miss, call Spotify API
  - Update job cache progressively
  - Send SSE update
    ↓
Complete: Store result:abc123
    ↓
Redirect frontend to /results/abc123
    ↓
Result is now shareable, refresh-safe, bookmarkable
```

---

## Key Decisions to Make

### 1. Result ID in path vs query?
- **Option A:** Path: `/results/abc123` (cleaner, more shareable) ✅ **RECOMMENDED**
- **Option B:** Query: `/?results=abc123` (simpler routing)

### 2. Job ID persistence:
- **Option A:** Store in URL query: `/?job=xyz789` ✅ **RECOMMENDED**
- **Option B:** Store in sessionStorage (lost on tab close)

### 3. Partial results display:
- **Option A:** Show songs as they're found (better UX but more complex)
- **Option B:** Wait for completion (simpler but slower perceived performance)

### 4. Cache key strategy for setlist results:
- **Option A:** `{mbid}:{tourName}` (simple, human-readable)
- **Option B:** `{mbid}:{tourName}:{dateRange}` (handles tour name collisions) ✅ **RECOMMENDED**
- **Option C:** UUID only (simplest, but harder to debug)

---

## Recommendation: Start with Phase 1 + Phase 3

**Phase 1 (Result Permalinks)** gives the biggest UX wins:
- Shareable URLs
- Refresh-safe results
- Natural caching of completed searches
- Foundation for job tracking later

**Phase 3 (Spotify Caching)** provides immediate performance boost:
- Faster processing for all searches
- Reduces API rate limiting issues
- Easy to implement
- Benefits compound over time

**Phase 2 (Job Tracking)** can be added later if users still experience issues with long-running searches.

---

## Success Metrics

After implementation, measure:
- ✅ Average search completion time (expect 40-60% reduction)
- ✅ Cache hit rate for Spotify tracks (target: >70% after warm-up)
- ✅ Number of shared result links clicked
- ✅ Reduction in incomplete searches (refresh/abandon rate)
- ✅ Repeat search time (should be <1 second for cached results)

---

## Future Enhancements (Post-MVP)

1. **Pre-warming cache:** Background job to cache popular artists
2. **Result expiration notifications:** Email users when shared link expires
3. **Result analytics:** Track most-viewed setlists
4. **Collaborative features:** Users can comment on results
5. **Export options:** Download results as CSV/JSON
6. **Historical tracking:** "Compare this tour to previous tours"

---

## Redis Key Schema Summary

```bash
# Completed Results (30-day TTL)
result:{uuid}                                    # Full result with songs + Spotify data

# Alternative setlist result key (searchable by artist/tour)
setlist_result:{mbid}:{tourName}:{dateRange}     # Maps to result:{uuid}

# Job Tracking (1-hour TTL)
job:{sessionId}:{timestamp}                      # In-progress search state

# Spotify Track Cache (90-day TTL)
spotify_track:{normalized_artist}_{song_name}    # Individual track lookups

# Existing (keep as-is)
tours:{mbid}                                     # Tour data (7-day TTL)
sess:{sessionId}                                 # User sessions (24-hour TTL)
```

---

## Files to Create/Modify

### New Files:
```
backend/utils/resultCacheManager.js      # Result storage/retrieval
backend/utils/jobCacheManager.js         # Job tracking (Phase 2)
backend/utils/spotifyTrackCache.js       # Spotify cache wrapper
frontend/src/pages/ResultsPage.jsx       # Results display page
```

### Modify:
```
backend/routes/setlistRoutes.js          # Add new endpoints
backend/utils/setlistAPIRequests.js      # Integrate caching
backend/utils/spotifyAPIRequests.js      # Add Spotify cache layer
frontend/src/App.jsx                     # Add routes
frontend/src/api/setlistService.js       # Add API methods
frontend/src/context/SetlistContext.jsx  # Add result/job state
```

---

## Notes

- Redis is already configured and working (used for sessions + tour caching)
- SSE infrastructure is proven and working well
- React Router v7 supports server-side data loading
- Bottleneck library already in place for rate limiting
- No breaking changes to existing functionality
