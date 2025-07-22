const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');
const devLogger = require('../utils/devLogger');

/**
 * Fetches MusicBrainz ID from Spotify URL
 * - Queries the MusicBrainz API with the Spotify artist URL
 * - Used to improve matching with Setlist.fm
 * 
 * @param {string} artistUrl Spotify artist URL
 * @returns {Object} MusicBrainz data including artist ID
 * @async
 */
const fetchMBIdFromSpotifyId = async (artistUrl) => {
  try {
    devLogger.log('musicbrainz', `Fetching MusicBrainz ID from Spotify URL`, {
      artistUrl: artistUrl
    });
    
    // Encode the artist URL to ensure it's safe for inclusion in a URL query parameter.
    const encodedUrl = encodeURIComponent(artistUrl);
    const apiUrl = `https://musicbrainz.org/ws/2/url/?query=url:${encodedUrl}&targettype=artist&fmt=json`;

    // Make the GET request to the MusicBrainz API.
    const response = await axios.get(apiUrl, {
      headers: {
        // A user-agent required by MusicBrainz.
        'User-Agent': 'SetListScout/1.0 (setlistscout@gmail.com)',
      },
    });

    const mbData = response.data;
    const artistInfo = mbData?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist;
    
    devLogger.log('musicbrainz', `MusicBrainz lookup completed`, {
      found: !!artistInfo,
      artistName: artistInfo?.name,
      artistId: artistInfo?.id,
      sortName: artistInfo?.["sort-name"],
      disambiguation: artistInfo?.disambiguation,
      totalUrls: mbData?.urls?.length || 0
    });
    
    console.log('MusicBrainz data:', response.data);
    return response.data;
  } catch (error) {
    devLogger.error('musicbrainz', 'Error querying MusicBrainz API', error);
    console.error('Error querying MusicBrainz API:', error);
    throw error;
  }
};



module.exports = { fetchMBIdFromSpotifyId };
