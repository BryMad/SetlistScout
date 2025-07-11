// Example of how to integrate background cache updates with live shows workflow

const BackgroundCacheUpdater = require('../utils/backgroundCacheUpdate');

/**
 * Modified version of processArtistWithUpdates that includes background caching
 */
async function processArtistWithUpdates(artist, clientId) {
  try {
    sseManager.sendUpdate(clientId, 'start', `Starting search for ${artist.name}`, 5);

    // ... existing workflow code ...
    
    // Get MusicBrainz info
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Get artist page and tour info
    let artistPage;
    let matched = false;

    if (isArtistNameMatch(artist.name, mbArtistName)) {
      matched = true;
      artistPage = await getArtistPageByMBID(mbid);
    } else {
      artistPage = await getArtistPageByName(artist);
    }

    const tourInfo = getTour(artistPage);
    const tourName = chooseTour(tourInfo, artist.name);

    // ... rest of existing workflow ...

    // Process setlists and get Spotify data
    let allTourInfo = [];
    if (tourName === "No Tour Info") {
      allTourInfo.push(artistPage);
    } else if (matched) {
      allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
    } else {
      allTourInfo = await getAllTourSongs(artist.name, tourName);
    }

    const tourInfoOrdered = getSongTally(allTourInfo);
    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered, progressCallback);

    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };

    // Send response to user immediately (don't make them wait for caching)
    sseManager.completeProcess(clientId, { tourData, spotifySongsOrdered });

    // **NEW: Background cache update (runs asynchronously after user gets response)**
    // This doesn't slow down the user experience but keeps cache fresh
    if (req.app.locals.redisClient) {
      BackgroundCacheUpdater.triggerUpdate(
        req.app.locals.redisClient,
        artist,
        tourName,
        extractSlugFromArtistPage(artistPage) // You'd need to implement this helper
      );
    }

  } catch (error) {
    console.error('Error in processArtistWithUpdates:', error);
    sseManager.sendError(clientId, "Internal Server Error. Please try again later.", 500);
  }
}

/**
 * Helper function to extract artist slug from setlist.fm artist page
 * This would need to be implemented based on your existing code
 */
function extractSlugFromArtistPage(artistPage) {
  // Extract slug from the artist page URL or data
  // Implementation depends on your existing setlist API structure
  if (artistPage && artistPage.artist && artistPage.artist.url) {
    // Extract from URL like: "https://www.setlist.fm/setlists/coldplay-3d6bde3.html"
    const match = artistPage.artist.url.match(/\/([^\/]+?)(?:\.html)?$/);
    return match ? match[1] : null;
  }
  return null;
}

module.exports = { processArtistWithUpdates };