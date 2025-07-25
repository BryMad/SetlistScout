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

### Current Status: ✅ **FULLY FUNCTIONAL WITH API-ONLY ARCHITECTURE**

The advanced search feature is fully implemented using **only the official Setlist.fm API**, completely removing any scraping or ToS violations. This provides better data accuracy and respects the increased API rate limits (16 requests/second, 50k/day).

### 🏗️ New Architecture: Pure API Implementation

**Architecture Redesign**: All tour fetching now uses the official Setlist.fm API with proper pagination, providing more accurate data while staying within ToS.

**Current Implementation**:
- `backend/utils/tourExtractor.js` - Fetches all tours via Setlist.fm API pagination ✅
- `backend/routes/setlistRoutes.js` - Updated to use API-only tour fetching ✅
- All scraping infrastructure **removed** ✅

### 🚀 API-Based Tour Discovery

**How it works**:
1. User selects artist → MusicBrainz validation for accurate matching
2. System paginates through **all** setlists for the artist via Setlist.fm API
3. Extracts unique tours with years and show counts from actual setlist data
4. Presents tours in dropdown: "Tour Name (2025) - 25 shows"
5. User selects tour → Standard setlist processing workflow

**API Endpoint Used**:
```
GET https://api.setlist.fm/rest/1.0/search/setlists
Parameters:
- artistMbid: {mbid} (when available) OR artistName: {name}
- p: {page} (for pagination)
```

**Rate Limiting**: 16 requests/second using Bottleneck library

### 📁 Current Advanced Search Files

**Backend Files**:
- `backend/utils/tourExtractor.js` ✅ (New API-based tour fetching)
- `backend/routes/setlistRoutes.js` ✅ (Updated to use tourExtractor)
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
- ✅ **NEW**: Tour dropdown appears immediately after artist selection
- ✅ All tours fetched via official API with years and show counts
- ✅ Tour-specific setlist processing with SSE
- ✅ Complete integration with existing TracksHUD display

**Architecture Improvements**:
- ✅ **100% ToS Compliant** - Only uses official Setlist.fm API
- ✅ **Better Data Quality** - Real setlist dates and accurate show counts
- ✅ **Simplified Architecture** - No external services or caching complexity
- ✅ **Faster Performance** - No external HTTP calls to scraper services
- ✅ **More Reliable** - No dependency on external scraping infrastructure

### 🔧 Benefits of API-Only Approach

- **✅ ToS Compliance**: Only uses official Setlist.fm API endpoints
- **✅ Better Data**: Actual setlist dates, accurate show counts, real tour information
- **✅ Higher Rate Limits**: 16 requests/second (increased from previous limits)
- **✅ More Reliable**: No scraping failures or external service dependencies
- **✅ Simpler Deployment**: No separate Vercel services or API keys to manage
- **✅ Real-time Data**: Always gets the latest tour information directly from source

## Technical Notes

- All setlist data sourced from Setlist.fm API with proper rate limiting
- MusicBrainz used for artist verification and matching
- Spotify integration handles both search and playlist creation
- SSE implementation provides smooth real-time user experience
- Mobile-responsive design with Chakra UI components
- Comprehensive error handling and fallback mechanisms
- **✅ Advanced search now 100% API-based with no scraping**
- **✅ Simplified architecture with no external dependencies**
- **✅ Improved data quality and ToS compliance**
