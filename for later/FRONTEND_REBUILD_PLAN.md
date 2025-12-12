# SetlistScout Frontend Rebuild Plan

## Overview

This document outlines a plan to rebuild the SetlistScout frontend from scratch using modern, lightweight tooling while preserving the existing backend API. The goal is to create a cleaner, more maintainable codebase.

## Current State

### What Works (Keep As-Is)
- **Backend** (`/backend/`) - All routes, middleware, and utilities are solid
  - `/routes/` - Auth, setlist, playlist, SSE endpoints
  - `/utils/` - SSE manager, API integrations, tour extraction, caching
  - `/middleware/` - Authentication handling
  - Redis session management
  - All external API integrations (Spotify, Setlist.fm, MusicBrainz, Deezer)

### What to Replace
- **Frontend** (`/frontend/`) - Chakra UI-based React app
  - Bloated component library with large bundle size
  - Complex theming system
  - Scattered state management via Context
  - Disorganized component structure

## New Tech Stack

### Core
- **Vite** - Build tool (keep, it's already in use)
- **React 18** - UI library (keep)
- **React Router v7** - Routing (keep)

### Styling
- **Tailwind CSS** - Utility-first CSS framework
  - Explicit, readable styling
  - Excellent tree-shaking
  - No runtime CSS-in-JS overhead

### Components
- **shadcn/ui** - Copy-paste component primitives
  - You own the code (not a dependency)
  - Built on Radix UI (accessibility)
  - Tailwind-styled
  - Only include what you use

### State Management
- **Zustand** - Minimal state management
  - ~1.2kb gzipped
  - No providers/wrappers needed
  - Selective re-renders
  - Simple API: `create((set) => ({ ... }))`

### HTTP Client
- **Axios** - Keep existing, works well

## New Directory Structure

```
frontend-new/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/                    # API layer (clean, typed)
│   │   ├── client.js           # Axios instance with interceptors
│   │   ├── auth.js             # Spotify auth API calls
│   │   ├── setlist.js          # Setlist/tour API calls
│   │   ├── playlist.js         # Playlist creation API calls
│   │   └── sse.js              # SSE connection utilities
│   │
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── button.jsx
│   │   │   ├── input.jsx
│   │   │   ├── dropdown.jsx
│   │   │   ├── tabs.jsx
│   │   │   ├── card.jsx
│   │   │   └── ...
│   │   ├── Layout.jsx          # App shell/layout
│   │   ├── Header.jsx          # Navigation header
│   │   └── Footer.jsx          # Site footer
│   │
│   ├── features/               # Feature-based modules
│   │   ├── artist-search/
│   │   │   ├── ArtistSearch.jsx        # Main search component
│   │   │   ├── ArtistSuggestions.jsx   # Dropdown suggestions
│   │   │   └── index.js                # Public exports
│   │   │
│   │   ├── tour-selector/
│   │   │   ├── TourSelector.jsx        # Tour dropdown
│   │   │   ├── TourList.jsx            # Tour list display
│   │   │   └── index.js
│   │   │
│   │   ├── tracks-display/
│   │   │   ├── TracksHUD.jsx           # Main tracks display
│   │   │   ├── TrackItem.jsx           # Individual track row
│   │   │   ├── TracksHeader.jsx        # Header with stats
│   │   │   └── index.js
│   │   │
│   │   ├── playlist/
│   │   │   ├── PlaylistCreator.jsx     # Create playlist UI
│   │   │   ├── PlaylistSuccess.jsx     # Success state
│   │   │   └── index.js
│   │   │
│   │   └── auth/
│   │       ├── SpotifyAuth.jsx         # Login/logout button
│   │       ├── AuthCallback.jsx        # OAuth callback handler
│   │       └── index.js
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useSSE.js           # SSE connection hook
│   │   ├── useSpotifyAuth.js   # Auth state hook
│   │   └── useDebounce.js      # Input debouncing
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── auth-store.js       # Spotify auth state
│   │   └── setlist-store.js    # Setlist/tracks state
│   │
│   ├── pages/                  # Route pages
│   │   ├── Home.jsx            # Main app page
│   │   ├── Privacy.jsx         # Privacy policy
│   │   ├── Terms.jsx           # Terms of service
│   │   └── Callback.jsx        # OAuth callback page
│   │
│   ├── lib/                    # Utility functions
│   │   ├── utils.js            # General helpers (cn function for Tailwind)
│   │   └── constants.js        # App constants
│   │
│   ├── App.jsx                 # Root component with routes
│   ├── main.jsx                # Entry point
│   └── index.css               # Tailwind imports + minimal globals
│
├── .env                        # Environment variables
├── index.html
├── package.json
├── postcss.config.js           # PostCSS config for Tailwind
├── tailwind.config.js          # Tailwind configuration
└── vite.config.js
```

## Migration Steps

### Phase 1: Project Setup

1. **Create new frontend directory**
   ```bash
   mkdir frontend-new
   cd frontend-new
   npm create vite@latest . -- --template react
   ```

2. **Install dependencies**
   ```bash
   # Core
   npm install react-router-dom axios zustand

   # Tailwind
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p

   # shadcn/ui prerequisites
   npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
   npm install @radix-ui/react-slot
   ```

3. **Configure Tailwind** (`tailwind.config.js`)
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     darkMode: ["class"],
     content: ["./index.html", "./src/**/*.{js,jsx}"],
     theme: {
       extend: {
         colors: {
           // Brand colors (indigo palette)
           brand: {
             50: '#eef2ff',
             100: '#e0e7ff',
             200: '#c7d2fe',
             300: '#a5b4fc',
             400: '#818cf8',
             500: '#6366f1',
             600: '#4f46e5',
             700: '#4338ca',
             800: '#3730a3',
             900: '#312e81',
           },
           // Accent colors (rose palette)
           accent: {
             500: '#f43f5e',
             600: '#e11d48',
           },
           // Spotify green - ONLY for Spotify actions
           spotify: {
             green: '#1DB954',
           },
         },
       },
     },
     plugins: [require("tailwindcss-animate")],
   }
   ```

4. **Set up CSS** (`src/index.css`)
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. **Create utility function** (`src/lib/utils.js`)
   ```javascript
   import { clsx } from "clsx"
   import { twMerge } from "tailwind-merge"

   export function cn(...inputs) {
     return twMerge(clsx(inputs))
   }
   ```

### Phase 2: Core Infrastructure

1. **Set up Zustand stores**

   `src/stores/auth-store.js`:
   ```javascript
   import { create } from 'zustand'

   const useAuthStore = create((set) => ({
     isAuthenticated: false,
     user: null,

     setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
     setUser: (user) => set({ user }),
     logout: () => set({ isAuthenticated: false, user: null }),
   }))

   export default useAuthStore
   ```

   `src/stores/setlist-store.js`:
   ```javascript
   import { create } from 'zustand'

   const useSetlistStore = create((set) => ({
     // Artist state
     artist: null,
     artistQuery: '',
     suggestions: [],

     // Tour state
     tours: [],
     selectedTour: null,

     // Tracks state
     tracks: [],
     tourInfo: null,

     // UI state
     isLoading: false,
     isLoadingTours: false,
     error: null,
     progress: null,

     // Actions
     setArtist: (artist) => set({ artist }),
     setArtistQuery: (artistQuery) => set({ artistQuery }),
     setSuggestions: (suggestions) => set({ suggestions }),
     setTours: (tours) => set({ tours }),
     setSelectedTour: (selectedTour) => set({ selectedTour }),
     setTracks: (tracks) => set({ tracks }),
     setTourInfo: (tourInfo) => set({ tourInfo }),
     setLoading: (isLoading) => set({ isLoading }),
     setLoadingTours: (isLoadingTours) => set({ isLoadingTours }),
     setError: (error) => set({ error }),
     setProgress: (progress) => set({ progress }),

     reset: () => set({
       artist: null,
       artistQuery: '',
       suggestions: [],
       tours: [],
       selectedTour: null,
       tracks: [],
       tourInfo: null,
       isLoading: false,
       isLoadingTours: false,
       error: null,
       progress: null,
     }),
   }))

   export default useSetlistStore
   ```

2. **Set up API client** (`src/api/client.js`)
   ```javascript
   import axios from 'axios'

   const apiClient = axios.create({
     baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:5001',
     withCredentials: true,
     timeout: 30000,
   })

   // Response interceptor for error handling
   apiClient.interceptors.response.use(
     (response) => response,
     (error) => {
       console.error('API Error:', error.response?.data || error.message)
       return Promise.reject(error)
     }
   )

   export default apiClient
   ```

3. **Create API modules**
   - `src/api/auth.js` - Login, logout, check auth status
   - `src/api/setlist.js` - Artist search, tour fetching, setlist processing
   - `src/api/playlist.js` - Playlist creation
   - `src/api/sse.js` - SSE connection management

### Phase 3: Component Migration

Migrate features one at a time, referencing the old code for logic but writing fresh components:

#### Order of Migration

1. **Layout & Navigation**
   - Header with logo
   - Basic page layout
   - Footer

2. **Artist Search**
   - Search input with debouncing
   - Deezer suggestions dropdown
   - Artist selection handling

3. **Tour Selector**
   - Tabs (Live Shows / Past Tours)
   - Tour dropdown with SSE streaming
   - Progress indicators

4. **Tracks Display**
   - Track list with frequency bars
   - Tour info header
   - Responsive design

5. **Spotify Integration**
   - Auth button
   - OAuth callback handling
   - Playlist creation

6. **Static Pages**
   - Privacy policy
   - Terms of service

### Phase 4: SSE Integration

The SSE hooks are critical for the real-time experience:

`src/hooks/useSSE.js`:
```javascript
import { useEffect, useRef, useCallback } from 'react'

export function useSSE(url, handlers) {
  const eventSourceRef = useRef(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(url, { withCredentials: true })
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handlers.onMessage?.(data)
    }

    eventSource.onerror = (error) => {
      handlers.onError?.(error)
      eventSource.close()
    }

    return eventSource
  }, [url, handlers])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return { connect, disconnect }
}
```

### Phase 5: Testing & Cutover

1. **Test against existing backend**
   - Both frontends can run simultaneously on different ports
   - Verify all API integrations work
   - Test OAuth flow end-to-end

2. **Compare functionality**
   - Live Shows search
   - Past Tours search with SSE
   - Playlist creation
   - Mobile responsiveness

3. **Cutover**
   - Rename `frontend` to `frontend-old`
   - Rename `frontend-new` to `frontend`
   - Update any deployment configs

## shadcn/ui Components to Add

Add these as needed (they're copy-pasted, not dependencies):

```bash
# Using shadcn CLI (after initial setup)
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add card
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
```

## Key Patterns to Follow

### 1. Feature-Based Organization
Keep related code together:
```
features/artist-search/
├── ArtistSearch.jsx      # Container component
├── ArtistSuggestions.jsx # Presentational component
├── useArtistSearch.js    # Feature-specific hook (optional)
└── index.js              # Public exports
```

### 2. Zustand Store Access
Always select specific state slices to prevent unnecessary re-renders:
```javascript
// Good - only re-renders when tracks changes
const tracks = useSetlistStore((state) => state.tracks)

// Bad - re-renders on any store change
const store = useSetlistStore()
```

### 3. API Layer Separation
Keep API calls in `/api/`, not in components:
```javascript
// src/api/setlist.js
export async function searchArtist(query) {
  const response = await apiClient.get('/setlist/artist_search_deezer', {
    params: { artist: query }
  })
  return response.data
}

// Component just calls the function
import { searchArtist } from '@/api/setlist'
```

### 4. Tailwind Class Organization
Use consistent ordering:
```jsx
<div className="
  flex items-center gap-4           // Layout
  p-4 mx-auto                       // Spacing
  bg-white rounded-lg shadow        // Visual
  hover:shadow-lg                   // States
  transition-shadow duration-200    // Animations
">
```

## Environment Variables

Same as current frontend:
```env
VITE_SERVER_URL=http://localhost:5001
VITE_ENABLE_ADVANCED_SEARCH=true
```

## Notes for Claude

When helping implement this plan:

1. **Reference old code for logic** - The business logic in the old frontend is correct, just poorly organized. Use it as reference.

2. **Don't over-engineer** - Keep components simple. A component that's 50-100 lines is fine.

3. **Mobile-first** - Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) starting from mobile.

4. **Preserve UX** - The current user flow works well. Don't change how the app works, just how it's built.

5. **One feature at a time** - Complete each feature before moving to the next. Test against the backend.

6. **Keep accessibility** - shadcn/ui components have good a11y built in. Don't break it.

## Estimated Effort

- Phase 1 (Setup): Quick setup, mostly configuration
- Phase 2 (Infrastructure): Core patterns, straightforward implementation
- Phase 3 (Components): Bulk of work, migrate feature by feature
- Phase 4 (SSE): Critical functionality, requires careful testing
- Phase 5 (Testing): Thorough testing and polish before cutover

Focus on getting each phase working completely before moving on.
