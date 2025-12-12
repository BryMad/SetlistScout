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
- **APIs**: Spotify OAuth 2.0, Setlist.fm, MusicBrainz

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
  - `/setlist/advanced_with_updates` (streaming with SSE for past tours discovery)
  - `/setlist/artist/:artistId/tours` (get all tours for an artist)
  - `/setlist/artist_search` (Spotify artist search - **primary**)
  - `/setlist/artist_search_deezer` (Deezer artist search - **deprecated**)
  - `/setlist/show/:id` (fetch individual show data for "Pick a Show" feature)
- **Playlist**: `/playlist/create_playlist` (requires auth)
- **SSE**: `/sse/connect` (real-time updates)
- **Consent**: `/consent/log`, `/consent/verify/:id`

### Frontend Structure

- `/src/pages/` - Main app pages (Home, Privacy, Terms)
- `/src/components/` - Reusable UI components
  - `UserInput.jsx` - Artist search with progressive disclosure for advanced options
  - `TracksHUD.jsx` - Main results display container
  - `TracksHUDTourHeader.jsx` - Tour metadata header
  - `TracksHUDTracksList.jsx` - Song list display
  - `TracksHUDPlaylistControls.jsx` - Spotify playlist creation
  - `TracksHUDShowSelector.jsx` - Individual show picker ("Pick a Show" feature)
  - `TracksHUDShowDisplay.jsx` - Individual show details
  - `Track.jsx` - Individual track component
  - `ProgressIndicator.jsx` - Loading state with progress
- `/src/context/` - Auth and Setlist React contexts
- `/src/hooks/` - Custom React hooks (useSetlist, useSpotify, useAuth, useTracksHud)
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

### Default Flow (Most Recent Tour)
1. **Artist Search**: User types artist name → Spotify API provides suggestions with artist images
2. **Artist Selection**: User clicks artist → Immediate processing of most recent tour
3. **Progress Updates**: Real-time SSE updates during setlist processing
4. **Results**: Song data appears in TracksHUD with full setlist analysis
5. **Pick a Show**: User can select individual shows to view specific setlist
6. **Playlist Creation**: Optional Spotify playlist creation with authentication

### Advanced Search (Work in Progress)
The advanced search UI exists but is **partially disabled** in the current build:

- **UI State**: "More search options" button reveals radio buttons for search modes
- **Search Modes Defined**:
  - "0" = Most Recent Tour (default, functional)
  - "1" = Past Tours (UI exists, dropdown disabled)
  - "2" = Last 60 Shows (UI exists, not yet implemented)
- **Tour Dropdown**: Code exists but is wrapped in `{false && (...)}` - intentionally hidden
- **Backend**: Fully functional `/advanced_with_updates` endpoint with SSE streaming

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
- **Spotify Search**: Artist search with album artwork (primary)
- **Smart Matching**: MusicBrainz validation for accurate artist mapping
- **Recent Tours**: Automatically processes the most recent tour data

### Setlist Processing
- **Real-time Updates**: SSE provides live feedback during data processing
- **Song Frequency**: Songs ranked by how often they're played live
- **Tour Metadata**: Band name, tour information, and show statistics

### Pick a Show Feature
- **Individual Show Selection**: After search completes, users can pick specific shows
- **Show Details**: View the exact setlist from any show in the tour
- **Endpoint**: `/setlist/show/:id` fetches individual show data

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

## Advanced Search Implementation

### Current Status: Backend Complete, Frontend Partially Disabled

The advanced search feature has a **fully functional backend** but the **frontend tour selection dropdown is disabled**.

### Backend (Fully Implemented)
- `backend/routes/setlistRoutes.js` - `/advanced_with_updates` endpoint with SSE
- `backend/utils/tourExtractor.js` - Streaming tour extraction with caching
- `backend/utils/tourCacheManager.js` - Redis caching for tour data (7-day TTL)
- `backend/utils/musicBrainzAPIRequests.js` - Artist validation

### Frontend (Partially Disabled)
- `frontend/src/components/UserInput.jsx`:
  - Progressive disclosure UI with "More search options" button
  - Radio buttons for search modes (visible but modes 1 & 2 not wired up)
  - Tour dropdown code exists but wrapped in `{false && (...)}` on line 423
  - `fetchTours()` function ready for use
  - `handleTourSelect()` function ready for use
- `frontend/src/api/setlistService.js`:
  - `fetchAdvancedToursWithUpdates()` - SSE-based tour discovery (implemented)
  - `fetchSpecificTourWithUpdates()` - Tour-specific setlist fetch (implemented)

### What Needs Work
1. **Enable Tour Dropdown**: Remove `{false && (...)}` wrapper in UserInput.jsx
2. **Wire Up Search Modes**: Connect radio button selection to different behaviors
3. **Test End-to-End**: Verify advanced search flow works with enabled UI
4. **Implement "Last 60 Shows"**: Mode 2 has no implementation yet

### API Flow (When Enabled)
1. User selects "Past Tours" search mode
2. User searches for artist → Spotify suggestions appear
3. User selects artist → `fetchAdvancedToursWithUpdates()` called
4. SSE streams tours as discovered with progress updates
5. User selects tour from dropdown → `fetchSpecificTourWithUpdates()` called
6. Results displayed in TracksHUD

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

### Development Tips
- Cache is checked before API calls to reduce load
- Cached data streams instantly via SSE ("Loading cached tour data...")
- Delete cache key to test fresh API fetching
- MusicBrainz ID preferred as cache key for accuracy

## Technical Notes

- All setlist data sourced from Setlist.fm API with proper rate limiting
- MusicBrainz used for artist verification and matching
- Spotify integration handles both artist search and playlist creation
- Server-Sent Events (SSE) for real-time progress updates
- Mobile-responsive design with Chakra UI components
- Comprehensive error handling and fallback mechanisms
