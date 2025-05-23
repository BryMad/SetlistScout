# Last.fm API Terms of Service Compliance

## Overview
This document outlines how SetlistScout complies with Last.fm's API Terms of Service.

## Last.fm ToS Requirements & Our Implementation

### ✅ 1. Attribution Requirement
**Requirement**: "You agree to use one of the buttons saying 'powered by AudioScrobbler' from the page located at http://www.last.fm/resources, such button linking back to Last.fm"

**Our Implementation**:
- `LastFmAttribution.jsx` component displays "Powered by Last.fm" 
- Links back to https://www.last.fm as required
- Displayed in two locations:
  - Footer of every page (`MainLayout.jsx`)
  - Below artist search results (`UserInput.jsx`)

### ✅ 2. Artist Page Links
**Requirement**: "All links to Last.fm from pages displaying information on an artist should link to the appropriate catalogue page on Last.fm. For example: http://www.last.fm/music/<artistname>"

**Our Implementation**:
- Artist objects include proper Last.fm URLs in format: `https://www.last.fm/music/{artistname}`
- "View on Last.fm" links in search results go directly to artist's Last.fm page
- URLs use proper encoding for artist names with spaces/special characters

### ✅ 3. API Usage Compliance
**Requirement**: General compliance with API usage terms

**Our Implementation**:
- Only using artist search and artist info endpoints
- Proper error handling and rate limiting respect
- No caching beyond session scope
- Attribution displayed prominently

## Implementation Details

### Components
- **LastFmAttribution.jsx**: Required attribution component
- **UserInput.jsx**: Shows attribution when search results are displayed
- **MainLayout.jsx**: Global footer attribution

### API Usage
- **lastFmAPIRequests.js**: Handles all Last.fm API calls with compliance notes
- **Routes**: `/artist_search_lastfm` endpoint with proper error handling

### URL Format
Artist URLs follow Last.fm's required format:
```
https://www.last.fm/music/{Artist+Name}
```
Where spaces are converted to '+' signs for proper Last.fm navigation.

## Compliance Verification

Before going live, verify:
- [ ] "Powered by Last.fm" attribution is visible on all pages
- [ ] Attribution links to https://www.last.fm
- [ ] Artist search results include "View on Last.fm" links
- [ ] Artist URLs follow correct Last.fm catalogue format
- [ ] No unauthorized use of Last.fm data or branding
- [ ] API key is kept secure and not exposed in frontend

## Terms of Service Link
Full Last.fm API Terms: https://www.last.fm/api/tos

## Notes
- Attribution is required whenever Last.fm data is displayed
- Links must go to appropriate Last.fm pages (not generic Last.fm homepage for artists)
- Compliance is built into the components, so removing attribution would break functionality
