# Migration from Deezer to MusicBrainz for Artist Search

## Overview

The artist search functionality has been migrated from Deezer API to MusicBrainz API to improve artist coverage and data accuracy. This change addresses the issue where certain artists were not available in Deezer's database.

## Changes Made

### Backend Changes

1. **New MusicBrainz API Integration** (`/backend/utils/musicBrainzAPIRequests.js`)
   - Added `searchArtistMusicBrainz()` function for artist search
   - Added `getArtistImage()` function with multiple fallback options for artist images
   - Enhanced `getLastFmArtistImage()` function for fetching images from Last.fm

2. **Updated Routes** (`/backend/routes/setlistRoutes.js`)
   - Replaced Deezer search endpoint with MusicBrainz endpoint
   - New route: `POST /artist_search_musicbrainz`
   - Removed: `POST /artist_search_deezer`

3. **Environment Variables** (`/backend/.env`)
   - Added optional `LASTFM_API_KEY` for enhanced image fetching

### Frontend Changes

1. **API Service** (`/frontend/src/api/setlistService.js`)
   - Replaced `searchArtistsDeezer()` with `searchArtistsMusicBrainz()`

2. **Hooks** (`/frontend/src/hooks/useSetlist.js`)
   - Updated hook to use MusicBrainz search function

3. **Components** (`/frontend/src/components/UserInput.jsx`)
   - Enhanced artist display to show disambiguation info and country
   - Updated comments and function calls to reflect MusicBrainz usage

## Image Handling Solution

Since MusicBrainz doesn't provide artist images, we implemented a multi-tier fallback system:

1. **Last.fm API** (if API key is provided): High-quality artist images
2. **UI Avatars Service**: Personalized placeholders with artist names
3. **Generic Placeholder**: Final fallback for any failures

## Benefits of MusicBrainz over Deezer

- **Better Coverage**: MusicBrainz has more comprehensive artist data
- **Higher Accuracy**: MusicBrainz focuses on accurate music metadata
- **Open Source**: MusicBrainz is community-driven and more reliable
- **Additional Metadata**: Provides disambiguation, country, and artist type info
- **Better Matching**: Works better with Setlist.fm data

## Setup Instructions

### Required (No API Key Needed)
The migration works immediately with placeholder images.

### Optional (For Better Images)
1. Get a free Last.fm API key at: https://www.last.fm/api/account/create
2. Add it to `/backend/.env`: `LASTFM_API_KEY=your_api_key_here`
3. Restart the backend server

## Data Structure Changes

### Before (Deezer)
```javascript
{
  name: "Artist Name",
  id: "deezer_id",
  url: "https://deezer.com/artist/...",
  image: { url: "deezer_image_url" }
}
```

### After (MusicBrainz)
```javascript
{
  name: "Artist Name",
  id: "musicbrainz_uuid",
  url: "https://musicbrainz.org/artist/...",
  image: { url: "image_url_with_fallbacks" },
  disambiguation: "band from UK", // Optional
  country: "GB", // Optional
  type: "Group" // Optional
}
```

## Testing

To test the migration:
1. Start the backend server
2. Search for artists in the frontend
3. Verify that artists not found in Deezer are now available
4. Check that artist images display correctly (with fallbacks)
5. Note the additional metadata (country, disambiguation) in the search results

## Rollback Instructions

If needed, the previous Deezer implementation can be restored by:
1. Reverting the API endpoint calls back to `artist_search_deezer`
2. Updating the frontend to use `searchArtistsDeezer`
3. Keeping the old Deezer function in the backend routes

However, the MusicBrainz implementation should provide better results for most use cases.
