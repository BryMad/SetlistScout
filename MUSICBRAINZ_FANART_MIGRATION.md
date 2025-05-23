# Migration Guide: Deezer to MusicBrainz + fanart.tv

## Overview

This guide explains how to migrate your UserInput component from using Deezer API to MusicBrainz API for artist search, with fanart.tv for high-quality artist images.

## Why Migrate?

**Benefits of MusicBrainz over Deezer:**
- **Better Coverage**: More comprehensive artist database
- **Higher Accuracy**: Focus on accurate music metadata
- **Open Source**: Community-driven, more reliable
- **Rich Metadata**: Disambiguation info, country, artist type
- **Better Matching**: Works seamlessly with Setlist.fm data

**Benefits of fanart.tv:**
- **High-Quality Images**: Professional artist photos and logos
- **Multiple Image Types**: Artist thumbnails, logos, backgrounds
- **Reliable CDN**: Fast image delivery worldwide

## Changes Made

### Backend Changes

1. **Enhanced MusicBrainz API Integration** (`/backend/utils/musicBrainzAPIRequests.js`)
   - Added `searchArtistMusicBrainz()` for artist search
   - Added `getArtistImageFromFanart()` for fanart.tv integration
   - Added `getFallbackArtistImage()` for placeholder images
   - Implemented rate limiting (1 req/sec) for MusicBrainz compliance

2. **New Route** (`/backend/routes/setlistRoutes.js`)
   - Added `POST /artist_search_musicbrainz` endpoint
   - Combines MusicBrainz search with fanart.tv image fetching
   - Maintains fallback to placeholder images

3. **Environment Configuration** (`/backend/.env`)
   - Added optional `FANART_API_KEY` for enhanced images
   - Without API key, uses attractive placeholder images

### Frontend Changes

1. **New Service** (`/frontend/src/api/musicBrainzService.js`)
   - Clean API interface for MusicBrainz search

2. **Updated setlistService** (`/frontend/src/api/setlistService.js`)
   - Added `searchArtistsMusicBrainz()` function

3. **Enhanced Hook** (`/frontend/src/hooks/useSetlist.js`)
   - Added MusicBrainz search method

4. **Updated UserInput Component** (`/frontend/src/components/UserInput.jsx`)
   - Switched from Deezer to MusicBrainz search
   - Enhanced display with disambiguation and country info
   - Improved visual hierarchy in search results

## API Key Setup (Optional)

### For High-Quality Images (Recommended)

1. Get a free fanart.tv API key:
   - Visit: https://fanart.tv/get-an-api-key/
   - Sign up for a free account
   - Get your personal API key

2. Add to `/backend/.env`:
   ```
   FANART_API_KEY=your_api_key_here
   ```

3. Restart your backend server

### Without API Key
The system works perfectly with attractive placeholder images generated using the artist name.

## Data Structure Comparison

### Before (Deezer)
```javascript
{
  name: "Artist Name",
  id: "deezer_numeric_id",
  url: "https://deezer.com/artist/123456",
  image: { url: "https://api.deezer.com/artist/123456/image" }
}
```

### After (MusicBrainz + fanart.tv)
```javascript
{
  name: "Artist Name",
  id: "musicbrainz-uuid-here",           // MusicBrainz ID (MBID)
  url: "https://musicbrainz.org/artist/uuid",
  mbid: "musicbrainz-uuid-here",         // Explicit MBID field
  image: { url: "fanart_or_placeholder_url" },
  disambiguation: "American rock band",   // Optional context
  country: "US",                         // Optional country code  
  type: "Group",                         // Optional artist type
  score: 100                            // Search relevance score
}
```

## Testing the Migration

1. **Start Both Servers**
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend  
   cd frontend && npm run dev
   ```

2. **Test Artist Search**
   - Search for popular artists (should show fanart.tv images if API key is set)
   - Search for obscure artists (should show placeholder images)
   - Notice disambiguation info in search results

3. **Verify Image Loading**
   - With fanart.tv API key: High-quality professional images
   - Without API key: Attractive personalized placeholders

## Image Fallback Strategy

The system implements a robust 3-tier fallback system:

1. **fanart.tv Images** (if API key provided)
   - Artist thumbnails (preferred)
   - HD music logos  
   - Standard music logos

2. **UI Avatars Placeholder** (always available)
   - Personalized with artist name
   - Consistent styling with your app theme
   - Fast loading

3. **Generic Placeholder** (final fallback)
   - Static placeholder for any failures

## Performance Considerations

- **Rate Limiting**: MusicBrainz requests are limited to 1/second (API requirement)
- **Concurrent Requests**: fanart.tv image fetching happens in parallel
- **Caching**: Consider implementing Redis caching for frequent searches
- **Error Handling**: Graceful degradation to placeholder images

## Rollback Plan

If you need to revert to Deezer:

1. Change `UserInput.jsx` to use `searchForArtistsDeezer`
2. The old Deezer endpoint is still available
3. Update any UI elements expecting MusicBrainz metadata

## Next Steps

1. **Optional Enhancements:**
   - Add caching layer for artist search results
   - Implement additional image sources (Last.fm, Discogs)
   - Add artist bio information from MusicBrainz

2. **Monitoring:**
   - Monitor MusicBrainz API usage (stay within rate limits)
   - Track image loading success rates
   - Monitor search result relevance

## Support

- **MusicBrainz API**: https://musicbrainz.org/doc/MusicBrainz_API
- **fanart.tv API**: https://fanart.tv/api-docs/
- **Rate Limiting**: MusicBrainz expects max 1 request/second
