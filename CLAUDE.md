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
- **Caching Strategy**: 
  - Redis session storage for user state
  - Tour data caching with 7-day TTL (respects Setlist.fm caching policy)
  - Cache key uses MusicBrainz ID for accurate artist matching
- **Error Recovery**: 
  - Graceful handling of API timeouts and failures
  - Individual Spotify song lookup failures don't break entire process
  - Better error attribution (Spotify vs Setlist.fm failures)

## Feature Flags

### Advanced Search Feature Flag

The advanced search (Past Tours) feature can be enabled/disabled via environment variables:

**Frontend**: Set `VITE_ENABLE_ADVANCED_SEARCH=true` in `.env` to enable the Past Tours tab
**Backend**: No changes needed - routes remain available but frontend controls access

When disabled:
- Only the simple artist search appears (no tabs)
- Users can still search for artists and see recent setlists
- No access to historical tour data
- No web scraping occurs

## Advanced Search Implementation

### Current Status: ✅ **FULLY FUNCTIONAL WITH REAL-TIME SSE UPDATES & REDIS CACHING**

The advanced search feature is fully implemented using **only the official Setlist.fm API** with **live streaming updates via Server-Sent Events (SSE)** and **Redis caching for improved performance**. This provides better data accuracy, respects API rate limits (16 requests/second), and delivers a superior user experience with real-time tour discovery.

### 🏗️ Live Streaming Architecture

**Revolutionary Update**: Advanced search now features **real-time tour discovery** where tours appear in the dropdown immediately as they're found, not after all pages are processed.

**Current Implementation**:
- `backend/utils/tourExtractor.js` - Streaming tour extraction with SSE updates & caching ✅
- `backend/utils/tourCacheManager.js` - Redis caching for tour data (7-day TTL) ✅
- `backend/routes/setlistRoutes.js` - New `/tours_stream` endpoint for live updates ✅
- `frontend/src/components/UserInput.jsx` - Real-time dropdown population ✅
- All scraping infrastructure **removed** ✅

### 🚀 Real-Time Tour Discovery

**How it works**:
1. User selects artist → MusicBrainz validation for accurate matching
2. **CACHE CHECK**: Redis checked for cached tour data (7-day TTL)
3. If cached, tours stream instantly from cache via SSE
4. If not cached: SSE connection established for live API updates
5. System paginates through setlists, **streaming tours as discovered**
6. **Tours appear in dropdown immediately** with live progress updates
7. Shows only tours with actual song data (filters out stub entries)
8. Multi-year tours displayed as "Tour Name (2019-2021) - 127 shows"
9. User can select tours **while search is still running**
10. **Tour data cached in Redis** for future searches

**Live Features**:
- **Progressive Loading**: Tours populate dropdown in real-time
- **Live Progress**: "Scanning page X of Y..." with current status
- **Song Validation**: Only includes tours with actual setlist data
- **Multi-Year Support**: Tours spanning years shown with date ranges
- **Immediate Selection**: Can click tours before search completes

**API Endpoints Used**:
```
# SSE Tour Streaming (NEW)
POST /setlist/artist/:artistId/tours_stream
- Real-time tour discovery via Server-Sent Events
- Streams tours as found, not batch at end

# Original Setlist API
GET https://api.setlist.fm/rest/1.0/search/setlists
Parameters:
- artistMbid: {mbid} (when available) OR artistName: {name}
- p: {page} (for pagination)
```

**Rate Limiting**: 16 requests/second using Bottleneck library

### 📁 Current Advanced Search Files

**Backend Files**:
- `backend/utils/tourExtractor.js` ✅ (API-based tour fetching with caching)
- `backend/utils/tourCacheManager.js` ✅ (Redis caching utility)
- `backend/routes/setlistRoutes.js` ✅ (Updated to use tourExtractor with caching)
- `backend/utils/musicBrainzAPIRequests.js` ✅ (Artist validation)

**Frontend Files**:
- `frontend/src/components/UserInput.jsx` ✅ (Tour dropdown after artist selection)
- `frontend/src/api/setlistService.js` ✅ (API integration)
- `frontend/src/context/SetlistContext.jsx` ✅ (Context integration)

**Removed Files**:
- ~~`scraper-service/`~~ - **Deleted** (no longer needed)
- ~~`backend/utils/tourCache.js`~~ - **Deleted** (no caching needed)
- ~~`backend/utils/backgroundCacheUpdate.js`~~ - **Deleted** (no caching needed)

### 🎮 Current Feature Status

**Working Features**:
- ✅ Tab-based UI (Live Shows / Past Tours)
- ✅ Artist search with Deezer suggestions
- ✅ MusicBrainz validation for accurate artist matching
- ✅ **NEW**: Real-time tour dropdown with live progressive loading
- ✅ **NEW**: Tours appear immediately as discovered (no waiting!)
- ✅ **NEW**: Live progress indicators ("Scanning page X of Y...")
- ✅ **NEW**: Song data validation (only tours with actual setlists)
- ✅ **NEW**: Multi-year tour support with date ranges
- ✅ **NEW**: Click tours before search completes
- ✅ **NEW**: Redis caching for instant repeat searches (7-day TTL)
- ✅ Tour-specific setlist processing with SSE
- ✅ Complete integration with existing TracksHUD display

**User Experience Improvements**:
- ✅ **Instant Feedback** - Tours appear as soon as found
- ✅ **Progressive Discovery** - No waiting for all pages to load
- ✅ **Live Status Updates** - Real-time progress and tour counts
- ✅ **Smart Filtering** - Only shows tours with song data
- ✅ **Better Tour Display** - "Tour Name (2019-2021) - 127 shows"
- ✅ **Responsive UI** - Loading state + dropdown simultaneously

**Architecture Improvements**:
- ✅ **100% ToS Compliant** - Only uses official Setlist.fm API
- ✅ **Real-Time Streaming** - SSE-powered progressive loading
- ✅ **Better Data Quality** - Validates song data, accurate show counts
- ✅ **Redis Caching** - 7-day cache for tour data, instant repeat searches
- ✅ **Superior UX** - Live updates eliminate waiting time
- ✅ **More Reliable** - No dependency on external scraping infrastructure

### 🔧 Benefits of Real-Time SSE Architecture

- **✅ ToS Compliance**: Only uses official Setlist.fm API endpoints
- **✅ Live User Experience**: Tours appear immediately as discovered
- **✅ Better Data Quality**: Validates song data, accurate show counts, real tour information
- **✅ Progressive Loading**: No waiting for complete results before interaction
- **✅ Higher Rate Limits**: 16 requests/second (respects API limits)
- **✅ More Reliable**: No scraping failures or external service dependencies
- **✅ Simpler Deployment**: No separate services or complex caching to manage
- **✅ Real-time Feedback**: Live progress updates and tour discovery
- **✅ Smart Filtering**: Only includes tours with actual setlist data
- **✅ Multi-Year Support**: Handles tours spanning multiple years correctly

## Technical Notes

- All setlist data sourced from Setlist.fm API with proper rate limiting
- MusicBrainz used for artist verification and matching
- Spotify integration handles both search and playlist creation
- **NEW**: Server-Sent Events (SSE) for real-time tour discovery and progress updates
- **NEW**: Song data validation ensures only meaningful tours are displayed
- **NEW**: Progressive UI updates allow interaction during data loading
- Mobile-responsive design with Chakra UI components
- Comprehensive error handling and fallback mechanisms
- **✅ Advanced search now features live streaming with immediate tour discovery**
- **✅ Superior user experience with real-time feedback and progressive loading**
- **✅ 100% API-based architecture with enhanced data quality and ToS compliance**

## Redis Cache Management

### Tour Data Caching
The application caches tour data in Redis to improve performance and reduce API calls:

**Cache Details**:
- **TTL**: 7 days (604,800 seconds) - respects Setlist.fm's minimal caching policy
- **Key Format**: `tours:{mbid}` or `tours:{normalized_artist_name}`
- **Storage**: JSON array of tour objects with name, showCount, dates

### Cache Utilities

**Node.js Cache Checker** (`backend/utils/checkTourCache.js`):
```bash
cd backend
node utils/checkTourCache.js "Artist Name" [mbid]
```

**Redis CLI Access**:
```bash
# Connect to Redis Cloud instance
redis-cli -h redis-14105.c13.us-west-2-mz.ec2.redns.redis-cloud.com -p 14105 -a TWDvNyhSQopqoF77y9E1numLAISWtt0h

# Common commands
KEYS tours:*                    # List all tour cache keys
GET tours:{key}                 # Get cached tour data
TTL tours:{key}                 # Check time to live
DEL tours:{key}                 # Delete cache entry (force refresh)
```

**Shell Script** (`backend/check-redis-cache.sh`):
```bash
cd backend
./check-redis-cache.sh
```

### Development Tips
- Cache is checked before API calls to reduce load
- Cached data streams instantly via SSE ("Loading cached tour data...")
- Delete cache key to test fresh API fetching
- MusicBrainz ID preferred as cache key for accuracy
