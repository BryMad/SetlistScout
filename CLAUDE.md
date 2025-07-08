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
   - **Original Mode**: User selects artist → Automatically processes most recent tour
   - **Advanced Mode**: User selects artist → Analyzes tours → User selects specific tour
   - MusicBrainz validates artist mapping
   - Setlists aggregated and songs tallied by frequency
   - Optional: Create Spotify playlist with auth

5. **Feature Flag System**
   - `advancedSearchEnabled` flag in SetlistContext controls search behavior
   - Default: `false` (original user experience)
   - When `true`: Shows advanced tour selection interface
   - Toggle function available: `toggleAdvancedSearch()`

### API Endpoints

- **Auth**: `/auth/login`, `/auth/callback`, `/auth/refresh`, `/auth/logout`
- **Setlist**: 
  - `/setlist/` (sync - original flow)
  - `/setlist/search_with_updates` (streaming - original flow)
  - `/setlist/analyze_tours` (advanced search - tour analysis)
  - `/setlist/process_selected_tour_with_updates` (advanced search - with SSE)
  - `/setlist/process_selected_tour` (advanced search - without SSE)
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

## Important Development Notes

1. **No Test Suite**: Project currently lacks tests. Consider adding Jest/Vitest when implementing new features.

2. **Redis Required**: Backend won't function without Redis running for session storage.

3. **API Keys**: Requires valid Spotify Client ID/Secret and Setlist.fm API key.

4. **CORS**: Configured for localhost:5173 (dev) and production domain.

5. **Mobile Support**: Auth callback handles mobile differently (URL fragment vs postMessage).

6. **Error Handling**: Implements retry logic for external API failures.

7. **Security**: Never log or expose API tokens. All sensitive data in environment variables.

8. **Deployment**: Configured for Render.com with build commands in root package.json.

## Advanced Search Feature Implementation Status

### ✅ COMPLETED: Year-Filtered Historic Tours Feature

**Implementation Date**: July 2025

**Current Status**: Complete year-filtered advanced search functionality with smart pagination, UI toggle, and Deezer-to-Spotify conversion. Feature is live and ready for production use.

#### Backend Enhancements
- **Smart Pagination Strategy**: Implemented first-last-middle page search with early stopping
  - New functions: `getArtistPagesSmartPagination()` and `getArtistPagesSmartPaginationByMBID()`
  - Fetches first page, last page, then middle pages as needed
  - Stops early if tour names are consistent across pages
  - Continues searching if different tour names are found
  - Maximum 10 pages with 5 middle page limit to prevent excessive API calls
- **Year Parameter Support**: Added year filtering to all pagination functions
  - Updated `getArtistPageByNameRaw()` and `getArtistPageByMBIDRaw()` with year parameters
  - Proper URL encoding without quotes (format: `artistName=Metallica&p=1&year=2004`)
  - Full integration with Setlist.fm year parameter API
- **Year-Filtered API Endpoints**:
  - `/analyze_tours_by_year` - Returns tour options for specific year with smart pagination
  - `/analyze_tours` - Original endpoint for recent tours (unchanged)
  - `/process_selected_tour_with_updates` - Processes selected tour with SSE progress updates
  - `/process_selected_tour` - Non-SSE version for tour processing
- **Enhanced Tour Detection**: Extended `analyzeTours()` function to work with smart pagination results
  - Processes results from 1-10 pages efficiently
  - Maintains all existing functionality (VIP filtering, orphan detection, date ranges)
- **Fixed Deezer Integration**: Added missing `deezerApiCalls.js` utility with proper image format

#### Frontend Enhancements
- **Advanced Search Toggle UI**: Complete toggle switch implementation
  - Clean switch control labeled "Advanced Search (Historic Tours)"
  - Enables/disables advanced search mode with smooth animations
  - Automatically resets form when toggled off
- **Year Input Component**: Conditional year selection interface
  - Number input with stepper controls (1960-current year)
  - Only appears when advanced search is enabled (smooth Collapse animation)
  - Optional field - leave empty for recent tours, specify year for historic tours
  - Proper validation and error handling
- **Enhanced Search Logic**: Intelligent flow control based on toggle and year state
  - **Default Mode**: Original behavior - select artist → immediate results
  - **Advanced Mode (no year)**: Enhanced flow - select artist → recent tour selection → results
  - **Advanced Mode (with year)**: Historic flow - select artist + year → year-filtered tour selection → results
- **Deezer-to-Spotify Conversion**: Automatic artist conversion for advanced search
  - New function: `convertDeezerToSpotifyArtist()` - searches Spotify for artist name
  - Helper functions: `isDeezerArtist()` and `ensureSpotifyArtist()`
  - Both `fetchTourOptions()` and `fetchTourOptionsForYear()` automatically convert Deezer artists
  - Fixes MusicBrainz lookup issues with Deezer URLs
- **State Management**: Enhanced SetlistContext with year filtering
  - New state: `selectedYear` for tracking year input
  - New functions: `setSelectedYear()`, `fetchTourOptionsForYear()`
  - Automatic year reset when toggling off advanced search
- **TourDropdown Component**: Complete tour selection interface (unchanged)
  - Nested dropdown appears inline with artist search
  - Shows "Checking tours..." during analysis
  - Clean, compact tour selection with metadata
  - "Recommended!" badges and staleness indicators
- **Preserved Original Flow**: Complete backward compatibility
  - Uses `fetchTourData()` for immediate processing
  - No UI changes visible to users in default mode

#### Key Implementation Features
1. **Three-Mode Operation**: Toggle controls seamless switching between search modes
   - **Quick Search (default)**: Immediate results for recent tours
   - **Advanced Search**: Tour selection for recent tours  
   - **Historic Search**: Year-filtered tour discovery and selection
2. **Smart Pagination Optimization**: Efficient API usage with early stopping
   - Searches first/last/middle pages strategically
   - Stops when single tour detected across pages
   - Continues when multiple tours found
   - Maximum 60 shows to prevent data overflow
3. **Complete Deezer-Spotify Integration**: Automatic artist conversion
   - Detects Deezer artists and converts to Spotify equivalents
   - Maintains MusicBrainz lookup functionality
   - Preserves existing user experience with Deezer suggestions
4. **Production Ready**: Live implementation with full error handling
   - Comprehensive validation for year input (1960-current year)
   - Graceful fallbacks for API failures
   - SSE integration for real-time progress updates
5. **Zero Breaking Changes**: Complete backward compatibility maintained
   - Original quick search unchanged
   - Existing API endpoints preserved
   - Mobile-responsive design across all modes

#### Current User Flows

**Quick Search (Default Mode)**
1. **Artist Search**: User types artist name → Deezer suggestions appear
2. **Artist Selection**: User clicks artist → Immediate processing of most recent tour
3. **Progress Updates**: Real-time SSE updates during processing
4. **Results**: Song data appears in TracksHUD with full setlist analysis

**Advanced Search (Toggle ON, No Year)**
1. **Toggle Advanced Search**: User enables advanced search mode
2. **Artist Search**: User types artist name → Deezer suggestions appear
3. **Artist Selection**: User clicks artist → Tour analysis begins ("Checking tours...")
4. **Deezer-to-Spotify Conversion**: Automatic conversion to Spotify artist for MusicBrainz lookup
5. **Tour Selection**: Dropdown appears with recent tour options and metadata
6. **Processing**: Real-time progress updates as selected tour is processed
7. **Results**: Song data appears in TracksHUD with full setlist analysis

**Historic Search (Toggle ON, Year Specified)**
1. **Toggle Advanced Search**: User enables advanced search mode
2. **Year Input**: User enters specific year (e.g., 2004)
3. **Artist Search**: User types artist name → Deezer suggestions appear
4. **Artist Selection**: User clicks artist → Year-filtered tour analysis begins
5. **Smart Pagination**: Backend uses first-last-middle page strategy for specified year
6. **Deezer-to-Spotify Conversion**: Automatic conversion to Spotify artist for MusicBrainz lookup
7. **Tour Selection**: Dropdown appears with year-specific tour options (e.g., "Madly in Anger with the World")
8. **Processing**: Real-time progress updates as selected tour is processed
9. **Results**: Song data appears in TracksHUD with full setlist analysis for that year

### 🔄 FUTURE ENHANCEMENTS

#### Potential Improvements
- **Date Range Selection**: Add start/end date inputs for more precise filtering
- **Tour Comparison**: Allow comparing setlists between different tours or years
- **Advanced Analytics**: Show tour evolution and song popularity trends over time
- **Bulk Year Search**: Search multiple years simultaneously
- **Performance Optimization**: Cache smart pagination results for faster repeated searches
- **Enhanced Error Handling**: Add retry logic with exponential backoff for MusicBrainz API failures

### Technical Implementation Details

#### Key File Locations
- **SetlistContext**: `frontend/src/context/SetlistContext.jsx`
  - `advancedSearchEnabled: false` (line 38) - Feature toggle
  - `selectedYear: null` (line 40) - Year filtering state
  - `toggleAdvancedSearch()`, `setSelectedYear()`, `fetchTourOptionsForYear()` functions
- **UserInput Component**: `frontend/src/components/UserInput.jsx`
  - Advanced search toggle UI and year input components
  - Flow control logic based on `advancedSearchEnabled` and `selectedYear` state
- **API Services**: `frontend/src/api/setlistService.js`
  - `analyzeToursForYear()` - Year-filtered tour analysis
  - `convertDeezerToSpotifyArtist()` - Automatic Deezer-to-Spotify conversion
- **Backend API**: `backend/utils/setlistAPIRequests.js`
  - `getArtistPagesSmartPagination()` - Smart pagination with year support
  - `getArtistPagesSmartPaginationByMBID()` - MBID-based smart pagination
- **Backend Routes**: `backend/routes/setlistRoutes.js`
  - `/analyze_tours_by_year` - Year-filtered endpoint with smart pagination

#### Smart Pagination Algorithm
1. **First Page**: Fetch page 1 to determine total pages and extract tour names
2. **Early Stop Check**: If only 1 page exists, return results immediately
3. **Last Page**: Fetch final page and compare tour names with first page
4. **Consistency Check**: If tour names match and only 1 tour found, stop early
5. **Middle Pages**: If multiple tours detected, fetch up to 5 middle pages
6. **Result Compilation**: Return all pages with tour names found

#### API URL Formats
- **Name-based**: `artistName=Metallica&p=1&year=2004`
- **MBID-based**: `artistMbid=65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab&p=1&year=2004`
- **No quotes**: Fixed URL encoding removes unnecessary quote encapsulation

#### Technical Notes
- Smart pagination capped at 10 pages maximum (200 shows) with 5 middle page limit
- Year validation range: 1960 to current year
- Automatic Deezer-to-Spotify conversion preserves MusicBrainz lookup functionality
- All tour grouping uses `tour.name` property from Setlist.fm API
- SSE integration maintained for real-time progress updates in all modes
- Mobile-responsive design with smooth Collapse animations
- Comprehensive error handling with graceful fallbacks
- Zero breaking changes - complete backward compatibility maintained