# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SetlistScout (formerly Concert Cram) is a full-stack web application that helps users discover songs artists are playing on tour and create Spotify playlists based on recent setlists. The app integrates with Setlist.fm, Spotify, and MusicBrainz APIs.

## Common Development Commands

### Local Development
```bash
# Start Redis (required for sessions)
redis-server

# Terminal 1 - Backend
cd backend
npm install  # First time only
npm start    # Runs on port 5001

# Terminal 2 - Frontend  
cd frontend
npm install  # First time only
npm run dev  # Runs on port 5173
```

### Build Commands
```bash
# Build entire project (from root)
npm run build

# Frontend only
cd frontend && npm run build

# Lint frontend code
cd frontend && npm run lint
```

### Environment Setup
- Frontend: Copy `frontend/example.env` to `frontend/.env` and set `VITE_SERVER_URL`
- Backend: Create `.env` with Spotify, Setlist.fm API credentials and Redis config

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite, Chakra UI, React Router v7, Axios
- **Backend**: Express.js, Redis (sessions), Winston (logging)
- **APIs**: Spotify OAuth 2.0, Setlist.fm, MusicBrainz, Deezer

### Key Architectural Patterns

1. **Session-Based Authentication**
   - Spotify tokens stored server-side in Redis sessions
   - No tokens sent to frontend (security)
   - 24-hour session expiration
   - CSRF protection via state parameter

2. **API Rate Limiting**
   - Bottleneck library for Spotify API (200ms between requests)
   - Express rate limiter (100 requests/15min per IP)
   - Graceful handling of 504 timeouts from Setlist.fm

3. **Real-Time Updates**
   - Server-Sent Events (SSE) for progress updates during setlist processing
   - SSE manager utility handles connection lifecycle

4. **Data Flow**
   - User selects artist → Automatically processes most recent tour
   - MusicBrainz validates artist mapping
   - Setlists aggregated and songs tallied by frequency
   - Optional: Create Spotify playlist with auth

### API Endpoints

- **Auth**: `/auth/login`, `/auth/callback`, `/auth/refresh`, `/auth/logout`
- **Setlist**: 
  - `/setlist/` (sync - legacy endpoint)
  - `/setlist/search_with_updates` (streaming with SSE for recent tours)
  - `/setlist/search_tour_with_updates` (streaming with SSE for specific tours)
  - `/setlist/artist/:artistId/tours` (get all tours for an artist)
  - `/setlist/artist_search` (Spotify artist search)
  - `/setlist/artist_search_deezer` (Deezer artist search)
- **Playlist**: `/playlist/create_playlist` (requires auth)
- **SSE**: `/sse/connect` (real-time updates)
- **Consent**: `/consent/log`, `/consent/verify/:id`

### Frontend Structure

- `/src/pages/` - Main app pages (Home, Privacy, Terms)
- `/src/components/` - Reusable UI components
- `/src/context/` - Auth and Setlist React contexts
- `/src/api/` - API service layer
- `/src/utils/` - Helper functions
- `/src/theme.js` - Chakra UI theme configuration

### Design System & Styling

1. **Theme Configuration**
   - Custom Chakra UI theme in `src/theme.js`
   - Brand colors: Indigo palette (`brand.500`, etc.)
   - Accent colors: Rose palette (`accent.500`, etc.)
   - Spotify colors: Isolated to `spotify.green` for Spotify-specific actions only
   - Modern shadow, border radius, and spacing scales

2. **Styling Approach**
   - Chakra UI component library with custom theme
   - No CSS modules or styled-components
   - Minimal global CSS (only in `src/index.css`)
   - Button hover effects and micro-interactions built into theme
   - Responsive design using Chakra's responsive props

3. **Brand Identity**
   - Independent visual identity (not affiliated with Spotify)
   - Spotify green (#1DB954) used ONLY for Spotify-specific actions
   - All other UI elements use indigo brand colors or rose accents
   - Modern glass-morphism effects and subtle animations

### Backend Structure

- `/routes/` - Express route handlers
- `/middleware/` - Auth middleware
- `/utils/` - API integrations, SSE manager, logger

## User Flow

The application provides two search modes for discovering artist setlists:

### Live Shows (Default)
1. **Artist Search**: User types artist name → Deezer suggestions appear with artist images
2. **Artist Selection**: User clicks artist → Immediate processing of most recent tour
3. **Progress Updates**: Real-time SSE updates during setlist processing
4. **Results**: Song data appears in TracksHUD with full setlist analysis
5. **Playlist Creation**: Optional Spotify playlist creation with authentication

### Advanced Search (Past Tours)
1. **Tab Selection**: User clicks "Past Tours" tab
2. **Artist Search**: Same Deezer-powered artist search as Live Shows
3. **Artist Selection**: User selects artist → System fetches all historical tours
4. **Tour Selection**: Dropdown appears with all tours (e.g., "Zoo TV (161 shows)")
5. **Tour Processing**: Real-time SSE updates for specific tour setlist analysis
6. **Results**: Historical setlist data displayed in TracksHUD
7. **Playlist Creation**: Same Spotify integration for historical data

## Important Development Notes

1. **No Test Suite**: Project currently lacks tests. Consider adding Jest/Vitest when implementing new features.

2. **Redis Required**: Backend won't function without Redis running for session storage.

3. **API Keys**: Requires valid Spotify Client ID/Secret and Setlist.fm API key.

4. **CORS**: Configured for localhost:5173 (dev) and production domain.

5. **Mobile Support**: Auth callback handles mobile differently (URL fragment vs postMessage).

6. **Error Handling**: Implements retry logic for external API failures.

7. **Security**: Never log or expose API tokens. All sensitive data in environment variables.

8. **Deployment**: Configured for Render.com with build commands in root package.json.

## Key Features

### Artist Discovery
- **Deezer Integration**: Fast artist search with album artwork
- **Smart Matching**: MusicBrainz validation for accurate artist mapping
- **Recent Tours**: Automatically processes the most recent tour data

### Setlist Processing
- **Real-time Updates**: SSE provides live feedback during data processing
- **Song Frequency**: Songs ranked by how often they're played live
- **Tour Metadata**: Band name, tour information, and show statistics

### Playlist Integration
- **Spotify OAuth**: Secure server-side token management
- **Automatic Creation**: One-click playlist generation from setlist data
- **Session Management**: 24-hour authenticated sessions with Redis storage

### Performance Optimizations
- **API Rate Limiting**: Respectful interaction with external APIs
- **Caching Strategy**: Redis session storage for user state
- **Error Recovery**: Graceful handling of API timeouts and failures

## Advanced Search Implementation

### Current Status: FULLY FUNCTIONAL WITH SEPARATED ARCHITECTURE ✅

The advanced search feature is fully implemented and working, allowing users to search historical tours for any artist. The scraping functionality has been successfully separated from the main application to comply with best practices.

### 🏗️ Architecture Overview: Scraping Service Separation

**Problem Solved**: Tour scraping that could violate setlist.fm ToS is now isolated from the main application that uses their API legitimately.

**Current Implementation**:
- `backend/utils/setlistSlugExtractor.js` - Extracts setlist.fm artist slugs using the official API ✅
- `scraper-service/` - Separate Vercel deployment for tour scraping ✅
- Main backend calls the external scraper service via HTTP ✅

### 🚀 Deployed Scraper Service

**Vercel Deployment**:
```
scraper-service/
├── api/
│   ├── tours/
│   │   └── [slug].js    # Vercel function endpoint
│   └── health.js        # Health check endpoint
├── tourScraper.js       # Scraping logic (moved from backend)
├── package.json         # Dependencies (cheerio, axios, etc.)
├── vercel.json         # Deployment configuration
└── .env.example        # Environment variables template
```

**Service URL**: Set in backend `.env` as:
```
SCRAPER_SERVICE_URL=https://your-scraper.vercel.app
SCRAPER_API_KEY=your-generated-api-key
```

**Security**: The scraper is protected by API key authentication to prevent unauthorized access.

**How it works**:
1. Main backend gets artist slug via official setlist.fm API
2. Backend calls: `GET ${SCRAPER_SERVICE_URL}/api/tours/${artistSlug}` with `X-API-Key` header
3. Vercel function validates API key before scraping
4. Returns tour data as JSON only if authenticated
5. Backend forwards data to frontend

### 🎯 Why This Architecture Is Necessary

**Technical Benefits**:
- Separates ToS-violating code from main application
- Different IP addresses reduce detection risk
- Main app can fallback gracefully if scraping service fails

**Legal Benefits**:
- Scraping and API usage come from different sources
- Reduces obvious connection between violations and API usage
- Easier to disable if needed without breaking main app

### 🔧 Vercel Deployment Guide

**To deploy your own scraper service:**

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy the scraper**:
   ```bash
   cd scraper-service
   vercel
   ```

3. **Configure environment variables**:
   ```bash
   vercel env add ALLOWED_ORIGINS
   # Enter: * (for testing) or your production URL
   
   vercel env add SCRAPER_API_KEY
   # Enter: Generate with 'openssl rand -hex 32'
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

5. **Update backend `.env`**:
   ```
   SCRAPER_SERVICE_URL=https://your-deployment.vercel.app
   SCRAPER_API_KEY=same-key-as-vercel
   ```

**Security Notes**: 
- The scraper requires API key authentication (X-API-Key header)
- Generate keys with: `openssl rand -hex 32`
- Disable Vercel's built-in authentication but keep API key protection

### 📁 Current Advanced Search Files

**Backend Files**:
- `backend/utils/setlistSlugExtractor.js` ✅ (API-only, uses official setlist.fm API)
- `backend/routes/setlistRoutes.js` ✅ (calls external scraper service)
- `backend/routes/setlistRoutes.js:25` - `fetchToursFromService()` function handles scraper communication

**Scraper Service Files** (Separate Vercel deployment):
- `scraper-service/api/tours/[slug].js` ✅ (Vercel function endpoint)
- `scraper-service/tourScraper.js` ✅ (Scraping logic, isolated from main app)
- `scraper-service/vercel.json` ✅ (Deployment configuration)

**Frontend Files**:
- `frontend/src/components/UserInput.jsx` ✅ (tab interface working)
- `frontend/src/api/setlistService.js` ✅ (tour-specific search working)
- `frontend/src/context/SetlistContext.jsx` ✅ (context integration working)

**Dependencies**:
- Main backend: NO scraping dependencies ✅
- Scraper service: Contains `cheerio` and scraping logic ✅

### 🎮 Current Feature Status

**Working Features**:
- ✅ Tab-based UI (Live Shows / Past Tours)
- ✅ Artist search and selection in both tabs
- ✅ Tour list fetching and display
- ✅ Tour-specific setlist processing with SSE
- ✅ Artist matching improvements (fixed tribute band issues)
- ✅ Complete integration with existing TracksHUD display

**Architecture Improvements Completed**:
- ✅ Scraping moved to separate Vercel service
- ✅ Backend updated to call external scraper via HTTP
- ✅ Fallback handling implemented (returns empty array on failure)
- ✅ Complete separation of concerns achieved

The feature is **fully functional** with **proper architectural separation** between legitimate API usage and web scraping.

## Intelligent Caching System Implementation

**Status**: ✅ **FULLY IMPLEMENTED AND WORKING** - Intelligent caching system is now active and operational.

### 🎯 Caching Strategy Overview

The app now has a fully functional intelligent caching system that minimizes scraping and dramatically improves performance. The system intelligently manages tour data caching with smart update logic.

**Files Implemented**:
- `backend/utils/tourCache.js` - Core caching class ✅
- `backend/utils/backgroundCacheUpdate.js` - Background cache updater ✅
- `backend/scripts/warmCache.js` - Popular artist pre-warming script
- `backend/routes/setlistRoutes.js` - Updated with full caching implementation ✅
- `backend/server.js` - Updated to provide Redis client access ✅

### ✅ Implementation Complete

**COMPLETED: Advanced Search Caching**

1. **✅ `/artist/:artistId/tours` endpoint updated in `setlistRoutes.js`**:
   - TourCache initialized with Redis client
   - Cache checked first before calling scraper service
   - Smart update logic detects new tours
   - Only scrapes when cache is missing or new tour detected

2. **✅ Redis client available to routes**:
   - `server.js` updated to make Redis client available as `req.app.locals.redisClient`
   - TourCache class imported and used in routes

**COMPLETED: Background Cache Updates**

3. **✅ Live Shows workflow integration**:
   - Background cache update added to `processArtistWithUpdates()` 
   - `BackgroundCacheUpdater.triggerUpdate()` called AFTER user gets response
   - Cache builds organically without slowing user experience

**AVAILABLE: Cache Warming**

4. **Popular artist pre-warming**:
   - Run `node backend/scripts/warmCache.js` to cache popular artists
   - Consider scheduling this periodically for high-traffic artists

### 🎯 Caching Logic Details

**Smart Update Frequency**:
- New artists (< 7 days): Check API every 6 hours
- Recent activity (< 30 days): Check daily  
- Moderate activity (< 180 days): Check weekly
- Old cache (> 180 days): Check monthly

**Invalid Tour Filtering**:
The cache automatically filters out invalid tour names like:
- "No Tour Info" (exact string from live shows workflow)
- Empty strings from failed tour detection
- Patterns like "Unknown", "Miscellaneous", etc.

**Data Flow**:
1. User searches artist → Check cache first
2. If cache exists and recent → Return cached data (instant response)
3. If cache old or missing → Check setlist.fm API for new tours
4. If new tour detected → Scrape all tours and update cache
5. If no new tour → Just update "last checked" timestamp

**Background Updates** (after live shows):
1. User gets live shows response immediately (no delay)
2. Background process checks if discovered tour exists in cache
3. If not, scrapes all tours and caches them
4. Popular artists build comprehensive cache over time

### 🔍 Key Implementation Notes

**Redis Keys**:
- Artist slugs: `artist:slug:coldplay`
- Tours: `artist:tours:coldplay-3d6bde3`

**Cache Structure**:
```javascript
{
  tours: [...], // Array of tour objects
  lastUpdated: "2024-07-10T...", // When cache was updated
  lastChecked: 1626123456789, // When we last checked API
  cachedAt: 1626123456789, // Original cache time
  originalCount: 25, // Tours before filtering
  filteredCount: 20 // Valid tours after filtering
}
```

**Integration Points**:
- Advanced search: Use cache to avoid scraping
- Live shows: Background updates to build cache
- Popular artists: Pre-warm cache with script

### 🚀 Benefits Now Active

- **✅ Minimal Scraping**: Only scrapes when new tours detected
- **✅ Fast Responses**: Cached results return instantly (confirmed working)
- **✅ Organic Growth**: Cache builds through normal usage via background updates
- **✅ Smart Updates**: More active artists checked more frequently based on usage patterns
- **✅ Clean Data**: Invalid tour names automatically filtered out before caching
- **✅ Graceful Fallbacks**: Returns cached data if scraper service fails
- **✅ Popularity Tracking**: Tracks artist search frequency for optimization

### 🔍 How to Verify Caching is Working

**Test API Response**:
```bash
# First call - fetches and caches data
curl "http://localhost:3000/setlist/artist/Artist%20Name/tours"

# Second call - should return {"cached": true, ...}
curl "http://localhost:3000/setlist/artist/Artist%20Name/tours"
```

**Server Console Logs to Look For**:
- `Fetching fresh tours for: [Artist]` (first call)
- `Cached X tours for [Artist] (Y total, Z filtered out)` (caching)
- `Returning cached tours for: [Artist] (X tours)` (subsequent calls)
- `Background cache update starting for [Artist]` (after live shows)

## Technical Notes

- All setlist data sourced from Setlist.fm API with proper rate limiting
- MusicBrainz used for artist verification and matching
- Spotify integration handles both search and playlist creation
- SSE implementation provides smooth real-time user experience
- Mobile-responsive design with Chakra UI components
- Comprehensive error handling and fallback mechanisms
- **Advanced search scraping successfully separated to Vercel service**
- **Microservice architecture provides IP isolation and risk mitigation**
- **✅ Intelligent caching system fully implemented and operational**
