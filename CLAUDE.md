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

### ✅ COMPLETED: Step 1 - Complete Advanced Search Infrastructure

**Implementation Date**: July 2025

**Current Status**: Feature flag system implemented - advanced search functionality built and preserved while maintaining original user experience.

#### Backend Enhancements
- **Enhanced Data Fetching**: Modified search to fetch up to 60 shows (3 API calls) instead of 20
  - New functions: `getMultipleArtistPages()` and `getMultipleArtistPagesByMBID()`
  - Added logging and show count validation to prevent data overflow
- **Smart Tour Detection**: Added `analyzeTours()` function to process multiple pages and identify all tours
  - Automatically detects multiple tours with metadata (date ranges, show counts, staleness indicators)
  - Filters out VIP/soundcheck tours
  - Identifies orphan shows (individual shows not part of named tours)
- **Dual API Endpoints**:
  - `/analyze_tours` - Returns tour options with metadata for user selection
  - `/process_selected_tour_with_updates` - Processes selected tour with SSE progress updates
  - `/process_selected_tour` - Non-SSE version for tour processing
- **Fixed Deezer Integration**: Added missing `deezerApiCalls.js` utility with proper image format

#### Frontend Enhancements
- **Feature Flag System**: `advancedSearchEnabled` controls which search flow is used
  - **Default (false)**: Original behavior - select artist → immediate results
  - **Advanced (true)**: Enhanced flow - select artist → tour selection → results
- **TourDropdown Component**: Complete tour selection interface
  - Nested dropdown appears inline with artist search
  - Shows "Checking tours..." during analysis
  - Clean, compact tour selection with metadata
  - "Recommended!" badges and staleness indicators
- **Preserved Original Flow**: Complete backward compatibility
  - Uses `fetchTourData()` for immediate processing
  - No UI changes visible to users in default mode
- **Mobile UI Refinements**: Enhanced TracksHUD component
  - Consistent button sizing across all screen sizes
  - Right-aligned stats section with vertical divider
  - 2px border radius on album artwork (Spotify guidelines)
  - Optimized spacing and layout for mobile devices

#### Key Implementation Features
1. **Seamless Mode Switching**: Single flag controls entire user experience
2. **Complete Infrastructure**: All advanced search functionality ready for activation
3. **Zero User Impact**: Live site maintains original behavior and appearance
4. **Development Ready**: Easy to toggle between modes for testing/development
5. **SSE Integration**: Full real-time progress updates in both modes
6. **Mobile Optimization**: Responsive design improvements across all components

#### Current Live User Flow (Default Mode)
1. **Artist Search**: User types artist name → Deezer suggestions appear
2. **Artist Selection**: User clicks artist → Immediate processing of most recent tour
3. **Progress Updates**: Real-time SSE updates during processing
4. **Results**: Song data appears in TracksHUD with full setlist analysis

#### Advanced Mode Flow (Available via Flag)
1. **Artist Search**: User types artist name → Deezer suggestions appear
2. **Artist Selection**: User clicks artist → Tour analysis begins ("Checking tours...")
3. **Tour Selection**: Dropdown appears with tour options and metadata
4. **Processing**: Real-time progress updates as selected tour is processed
5. **Results**: Song data appears in TracksHUD with full setlist analysis

### 🔄 NEXT STEPS: Future Development

#### Immediate Options
- **UI Toggle**: Add advanced search toggle button to interface
- **Development Mode**: Change `advancedSearchEnabled: false` to `true` for testing

#### Future Enhancements
- **Year-based Filtering**: Add date range selection to advanced mode
- **Tour Comparison**: Allow comparing setlists between different tours
- **Advanced Analytics**: Show tour evolution and song popularity trends

### Technical Implementation Details

#### Feature Flag Location
- **File**: `frontend/src/context/SetlistContext.jsx:38`
- **Default**: `advancedSearchEnabled: false`
- **Toggle Function**: `toggleAdvancedSearch()` available in context

#### Flow Control Logic
- **File**: `frontend/src/components/UserInput.jsx:112-121`
- **Logic**: Conditional branch based on `advancedSearchEnabled` flag
- **Fallback**: Original `fetchTourData()` maintains legacy behavior

#### Key Components
- **TourDropdown**: `frontend/src/components/TourDropdown.jsx`
- **SetlistContext**: Enhanced with tour analysis state and methods
- **API Services**: Dual endpoint support in `frontend/src/api/setlistService.js`

### Technical Notes
- All tour grouping uses `tour.name` property from Setlist.fm API
- Show counting is capped at 60 to prevent data overflow
- SSE integration maintained for real-time user feedback in both modes
- Mobile-responsive design implemented for all components
- Comprehensive error handling and fallback mechanisms in place
- Zero breaking changes - complete backward compatibility maintained