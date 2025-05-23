# Migration from Deezer to Last.fm for Artist Search

## Overview

The artist search functionality has been migrated from Deezer API to Last.fm API to improve artist coverage while simplifying the codebase. This change addresses the issue where certain artists were not available in Deezer's database and provides built-in artist images.

## Benefits of Last.fm over Deezer

- **Better Coverage**: Last.fm has a more comprehensive artist database
- **Built-in Images**: No need for complex image fallback systems
- **Rich Metadata**: Provides listener counts and play statistics
- **Single API**: Simpler implementation with one service
- **Faster Performance**: One API call instead of multiple services
- **Music-focused**: Last.fm specializes in music data

## Changes Made

### Backend Changes

1. **New Last.fm API Integration** (`/backend/utils/lastFmAPIRequests.js`)
   - Added `searchArtistLastFm()` function for comprehensive artist search
   - Handles artist images directly from Last.fm API
   - Provides listener counts and popularity metrics

2. **Updated Routes** (`/backend/routes/setlistRoutes.js`)
   - New route: `POST /artist_search_lastfm`
   - Removed: `POST /artist_search_musicbrainz` and `POST /artist_search_deezer`

3. **Environment Variables** (`/backend/.env`)
   - **REQUIRED**: `LASTFM_API_KEY` for artist search functionality

### Frontend Changes

1. **API Service** (`/frontend/src/api/setlistService.js`)
   - Replaced with `searchArtistsLastFm()` function

2. **Hooks** (`/frontend/src/hooks/useSetlist.js`)
   - Updated to use Last.fm search function

3. **Components** (`/frontend/src/components/UserInput.jsx`)
   - Displays listener counts instead of country/disambiguation
   - Updated to use Last.fm API calls

## Data Structure

### New Last.fm Response Format
```javascript
{
  name: "Artist Name",
  id: "musicbrainz_uuid_or_generated_id", 
  url: "https://www.last.fm/music/Artist+Name",
  image: { url: "https://lastfm-img2.akamaized.net/..." },
  listeners: 1250000, // Number of Last.fm listeners
  playcount: 45000000 // Total plays on Last.fm
}
```

## Setup Instructions

### Required Steps
1. **Get a free Last.fm API key** at: https://www.last.fm/api/account/create
2. **Add your API key** to `/backend/.env`: `LASTFM_API_KEY=your_api_key_here`
3. **Restart the backend server**

### API Key Application Details
Use the description from earlier in our conversation when applying for the Last.fm API key.

## Key Improvements

1. **Simplified Architecture**: Single API instead of complex fallback systems
2. **Better User Experience**: Real artist images and listener metrics help users identify artists
3. **Improved Performance**: Faster searches with fewer API calls
4. **Enhanced Reliability**: Last.fm's robust music database
5. **Easier Maintenance**: One service to maintain instead of multiple integrations

## Testing

To test the migration:
1. Add your Last.fm API key to the `.env` file
2. Restart the backend server
3. Search for artists in the frontend
4. Verify that:
   - Artists not found in Deezer are now available
   - Artist images display correctly
   - Listener counts appear in search results
   - Search performance is improved

## Rollback Instructions

If needed, you can rollback to the previous Deezer implementation by:
1. Reverting the API endpoint calls back to `artist_search_deezer`  
2. Updating the frontend to use the old Deezer functions
3. However, the Last.fm implementation should provide significantly better results

## Error Handling

The system will show a clear error message if the Last.fm API key is missing or invalid, prompting users to add their API key to continue using the artist search functionality.

## Migration Complete! 🎉

This migration provides a much cleaner, faster, and more reliable artist search experience while solving the original problem of missing artists in Deezer's database.
