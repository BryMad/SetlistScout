const axios = require('axios');
const logger = require('./logger');

/**
 * Search for artists on Deezer
 * 
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of artist objects
 */
const searchDeezerArtists = async (query) => {
  try {
    logger.info('Searching for artists on Deezer', { query });
    
    const response = await axios.get(`https://api.deezer.com/search/artist`, {
      params: {
        q: query,
        limit: 10
      }
    });

    if (!response.data || !response.data.data) {
      return [];
    }

    const artists = response.data.data.map(artist => ({
      id: artist.id.toString(),
      name: artist.name,
      image: { url: artist.picture_medium || artist.picture },
      url: artist.link,
      popularity: artist.nb_fan || 0
    }));

    logger.info('Found Deezer artists', { 
      query, 
      count: artists.length 
    });

    return artists;
  } catch (error) {
    logger.error('Error searching Deezer artists', {
      query,
      error: error.message,
      status: error.response?.status
    });
    
    // Return empty array on error to prevent breaking the flow
    return [];
  }
};

module.exports = {
  searchDeezerArtists
};