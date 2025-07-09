const { getArtistPageByName, getArtistPageByMBID } = require('./setlistAPIRequests');
const logger = require('./logger');

/**
 * Extracts the setlist.fm slug from an artist URL
 * @param {string} url - The setlist.fm artist URL
 * @returns {string|null} The extracted slug or null if not found
 */
function extractSlugFromUrl(url) {
  if (!url) return null;
  
  // Match patterns like:
  // https://www.setlist.fm/setlists/the-beatles-23d6a88b.html
  // https://www.setlist.fm/setlists/artist-name-slug-id.html
  const match = url.match(/setlists\/(.+)\.html/);
  return match ? match[1] : null;
}

/**
 * Finds the best artist match from setlist results
 * @param {Array} setlists - Array of setlist objects
 * @param {string} searchName - The artist name we're searching for
 * @returns {Object|null} The best matching artist object or null
 */
function findBestArtistMatch(setlists, searchName) {
  if (!setlists || setlists.length === 0) return null;
  
  const normalizedSearchName = searchName.toLowerCase().trim();
  
  // First, try to find an exact match
  const exactMatch = setlists.find(setlist => 
    setlist.artist.name.toLowerCase().trim() === normalizedSearchName
  );
  
  if (exactMatch) {
    logger.info('Found exact artist name match', { 
      searchName, 
      matchedName: exactMatch.artist.name 
    });
    return exactMatch.artist;
  }
  
  // Second, try to find a match that starts with the search name
  const startsWithMatch = setlists.find(setlist => 
    setlist.artist.name.toLowerCase().trim().startsWith(normalizedSearchName)
  );
  
  if (startsWithMatch) {
    logger.info('Found artist name starting with search term', { 
      searchName, 
      matchedName: startsWithMatch.artist.name 
    });
    return startsWithMatch.artist;
  }
  
  // Third, exclude tribute bands and covers
  const excludeKeywords = ['tribute', 'cover', 'covers', 'tribute band', 'cover band'];
  const nonTributeMatches = setlists.filter(setlist => {
    const artistName = setlist.artist.name.toLowerCase();
    return !excludeKeywords.some(keyword => artistName.includes(keyword));
  });
  
  if (nonTributeMatches.length > 0) {
    logger.info('Found non-tribute artist match', { 
      searchName, 
      matchedName: nonTributeMatches[0].artist.name 
    });
    return nonTributeMatches[0].artist;
  }
  
  // Fallback to the first result
  logger.warn('Using first result as fallback', { 
    searchName, 
    matchedName: setlists[0].artist.name 
  });
  return setlists[0].artist;
}

/**
 * Gets the setlist.fm slug for an artist
 * @param {Object} artist - Artist object with name
 * @param {string} mbid - MusicBrainz ID (optional)
 * @returns {Promise<string|null>} The setlist.fm slug or null if not found
 */
async function getSetlistSlug(artist, mbid) {
  try {
    logger.info('Attempting to get setlist.fm slug', { 
      artistName: artist?.name, 
      mbid 
    });

    // Use MBID if available, otherwise use artist name
    const response = mbid 
      ? await getArtistPageByMBID(mbid)
      : await getArtistPageByName(artist);

    // Check if we have setlists in the response
    if (!response?.setlist || response.setlist.length === 0) {
      logger.warn('No setlists found for artist', { 
        artistName: artist?.name, 
        mbid 
      });
      return null;
    }

    // Find the best matching artist instead of just taking the first one
    const bestMatch = findBestArtistMatch(response.setlist, artist.name);
    
    if (!bestMatch?.url) {
      logger.warn('No artist URL found in best match', { 
        artistName: artist?.name 
      });
      return null;
    }

    // Extract the slug from the URL
    const slug = extractSlugFromUrl(bestMatch.url);
    
    if (slug) {
      logger.info('Successfully extracted setlist.fm slug', { 
        artistName: artist?.name, 
        matchedArtistName: bestMatch.name,
        slug 
      });
    } else {
      logger.warn('Failed to extract slug from URL', { 
        artistUrl: bestMatch.url 
      });
    }

    return slug;
  } catch (error) {
    logger.error('Error getting setlist.fm slug', { 
      error: error.message, 
      artistName: artist?.name,
      mbid 
    });
    return null;
  }
}

module.exports = {
  getSetlistSlug,
  extractSlugFromUrl
};