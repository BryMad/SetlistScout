const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');

/**
 * Search for artists using Last.fm API
 * - Queries the Last.fm API for artist search with images included
 * - Returns formatted artist data for the frontend
 * 
 * COMPLIANCE NOTE: This implementation complies with Last.fm API Terms of Service:
 * - Links to Last.fm artist pages are provided in the artist.url field
 * - Frontend displays "Powered by Last.fm" attribution as required
 * - Artist pages link back to appropriate Last.fm catalogue pages
 * 
 * @param {string} artistName Artist name to search for
 * @returns {Array} Array of artist objects with Last.fm links
 * @async
 */
const searchArtistLastFm = async (artistName) => {
  try {
    console.log("Searching for Artist on Last.fm", { artistName });

    const apiKey = process.env.LASTFM_API_KEY;
    if (!apiKey) {
      throw new Error("Last.fm API key not found. Please add LASTFM_API_KEY to your environment variables.");
    }

    // Encode the artist name for the query
    const encodedQuery = encodeURIComponent(artistName);
    const apiUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodedQuery}&api_key=${apiKey}&format=json&limit=10`;

    // Make the GET request to the Last.fm API
    const response = await axios.get(apiUrl);

    console.log("Last.fm artist search successful", { artistName, count: response.data.results?.artistmatches?.artist?.length || 0 });

    if (!response.data.results?.artistmatches?.artist) {
      return [];
    }

    // Last.fm returns either an array (multiple results) or object (single result)
    let artists = response.data.results.artistmatches.artist;
    if (!Array.isArray(artists)) {
      artists = [artists];
    }

    // Transform Last.fm data - skip image fetching since Last.fm mostly has placeholders
    const transformedArtists = artists.map((artist) => {
      // Create a personalized placeholder for each artist
      const artistInitials = artist.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
      
      // Use a colorful placeholder with artist initials
      const colors = ['4F46E5', 'DC2626', '059669', 'D97706', '7C3AED', 'DB2777'];
      const colorIndex = artist.name.length % colors.length;
      const backgroundColor = colors[colorIndex];
      
      const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(artistInitials)}&size=64&background=${backgroundColor}&color=fff&bold=true&format=png`;
      
      console.log(`✓ Generated placeholder for ${artist.name}: ${artistInitials}`);

      return {
        name: artist.name,
        id: artist.mbid || `lastfm_${artist.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        url: artist.url || `https://www.last.fm/music/${encodeURIComponent(artist.name.replace(/\s+/g, '+'))}`,
        image: { url: imageUrl },
        listeners: parseInt(artist.listeners) || 0,
        playcount: parseInt(artist.playcount) || 0
      };
    });

    return transformedArtists;
  } catch (error) {
    console.error("Error searching artist on Last.fm", { artistName, error: error.message });
    throw error;
  }
};

/**
 * Fetches MusicBrainz ID from Spotify URL
 * - Queries the MusicBrainz API with the Spotify artist URL
 * - Used to improve matching with Setlist.fm
 * 
 * @param {string} artistUrl Spotify artist URL
 * @returns {Object} MusicBrainz data including artist ID
 * @async
 */
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

    console.log('MusicBrainz data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error querying MusicBrainz API:', error);
    throw error;
  }
};



module.exports = { fetchMBIdFromSpotifyId, searchArtistLastFm };
