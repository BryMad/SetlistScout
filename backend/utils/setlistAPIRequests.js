const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');
const limiter = new Bottleneck({
  minTime: 600, // minimum time (ms) between requests
  maxConcurrent: 1, // maximum concurrent requests
});

/**
 * Introduces a delay between API calls
 * - Used for rate limiting
 * 
 * @param {number} ms Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A helper function that wraps axios.get with retry logic.
 * If a 429 (Too Many Requests) error is encountered, it will wait (with exponential backoff) and retry.
 *
 * @param {string} url - The URL to request.
 * @param {object} config - The axios configuration object.
 * @param {number} retries - Number of retry attempts (default 3).
 * @param {number} backoff - Initial backoff delay in ms (default 1000).
 */
const axiosGetWithRetry = async (url, config, retries = 3, backoff = 1000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      // Check if the error is a 429 (Too Many Requests)
      if (error.response && error.response.status === 429 && attempt < retries) {
        logger.warn(`429 error received, retrying attempt ${attempt + 1} for URL: ${url}`);
        await delay(backoff);
        backoff *= 2; // Exponential backoff
        continue;
      } else {
        throw error;
      }
    }
  }
};

// Raw functions for the artist page requests.
const getArtistPageByNameRaw = async (artist) => {
  logger.info('Requesting setlist artist page', { artist });
  const encodedArtistName = encodeURIComponent(`"${artist.name}"`);
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodedArtistName}&p=1`;
  
  try {
    const response = await axiosGetWithRetry(url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.SETLIST_API_KEY,
      },
    });
    
    logger.info('Received setlist at artist page');
    
    // Check if we got an empty response or no setlists
    if (!response.data || !response.data.setlist || response.data.setlist.length === 0) {
      const error = new Error('NO_SETLIST_DATA');
      error.isNoSetlistData = true;
      error.details = {
        total: response.data?.total || 0,
        itemsPerPage: response.data?.itemsPerPage || 0,
        page: response.data?.page || 0,
        artistName: artist.name
      };
      throw error;
    }
    
    return response.data;
  } catch (error) {
    // If it's already our custom no-setlist-data error, re-throw it
    if (error.isNoSetlistData) {
      throw error;
    }
    
    // Handle specific HTTP status codes
    if (error.response) {
      if (error.response.status === 404) {
        const noDataError = new Error('ARTIST_NOT_FOUND_ON_SETLIST_FM');
        noDataError.isNoSetlistData = true;
        noDataError.httpStatus = 404;
        noDataError.artistName = artist.name;
        throw noDataError;
      }
      
      if (error.response.status === 400) {
        const noDataError = new Error('INVALID_ARTIST_DATA');
        noDataError.isNoSetlistData = true;
        noDataError.httpStatus = 400;
        noDataError.artistName = artist.name;
        throw noDataError;
      }
    }
    
    // Re-throw all other errors (network, API key, etc.)
    throw error;
  }
};

const getArtistPageByMBIDRaw = async (mbid) => {
  logger.info('Requesting setlist artist page by MBID:', { mbid });
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1`;
  
  try {
    const response = await axiosGetWithRetry(url, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.SETLIST_API_KEY,
      },
    });
    
    logger.info('Received setlist at artist page');
    
    // Check if we got an empty response or no setlists
    if (!response.data || !response.data.setlist || response.data.setlist.length === 0) {
      const error = new Error('NO_SETLIST_DATA');
      error.isNoSetlistData = true;
      error.details = {
        total: response.data?.total || 0,
        itemsPerPage: response.data?.itemsPerPage || 0,
        page: response.data?.page || 0
      };
      throw error;
    }
    
    return response.data;
  } catch (error) {
    // If it's already our custom no-setlist-data error, re-throw it
    if (error.isNoSetlistData) {
      throw error;
    }
    
    // Handle specific HTTP status codes
    if (error.response) {
      if (error.response.status === 404) {
        const noDataError = new Error('ARTIST_NOT_FOUND_ON_SETLIST_FM');
        noDataError.isNoSetlistData = true;
        noDataError.httpStatus = 404;
        throw noDataError;
      }
      
      if (error.response.status === 400) {
        const noDataError = new Error('INVALID_ARTIST_DATA');
        noDataError.isNoSetlistData = true;
        noDataError.httpStatus = 400;
        throw noDataError;
      }
    }
    
    // Re-throw all other errors (network, API key, etc.)
    throw error;
  }
};

/**
 * Gets artist page by name from Setlist.fm
 * - Rate-limited to avoid API restrictions
 * 
 * @param {Object} artist Artist object with name
 * @returns {Object} Artist page data from Setlist.fm
 * @async
 */
const getArtistPageByName = limiter.wrap(getArtistPageByNameRaw);
/**
 * Gets artist page by MusicBrainz ID from Setlist.fm
 * - Rate-limited to avoid API restrictions
 * 
 * @param {string} mbid MusicBrainz ID
 * @returns {Object} Artist page data from Setlist.fm
 * @async
 */
const getArtistPageByMBID = limiter.wrap(getArtistPageByMBIDRaw);

/**
 * Gets multiple pages of artist setlists for better tour detection
 * - Fetches up to 3 pages (60 shows) by default
 * - Helps identify multiple tours in recent history
 * 
 * @param {Object} artist Artist object with name
 * @param {number} pageCount Number of pages to fetch (default: 3)
 * @returns {Array} Array of page data
 * @async
 */
const getMultipleArtistPages = async (artist, pageCount = 3) => {
  logger.info('Fetching multiple artist pages for tour detection', { artist: artist.name, pageCount });
  const encodedArtistName = encodeURIComponent(`"${artist.name}"`);
  const allPages = [];

  try {
    // Fetch first page
    const firstPage = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodedArtistName}&p=1`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });

    allPages.push(firstPage.data);
    const totalAvailable = Math.ceil(firstPage.data.total / firstPage.data.itemsPerPage);
    const pagesToFetch = Math.min(pageCount, totalAvailable);

    // Ensure we don't exceed the intended show limit (20 shows per page)
    const maxShows = pageCount * 20;

    // Fetch additional pages if available
    if (pagesToFetch > 1) {
      const promises = [];
      for (let i = 2; i <= pagesToFetch; i++) {
        const request = limiter.schedule(() => {
          const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodedArtistName}&p=${i}`;
          return axiosGetWithRetry(url, {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.SETLIST_API_KEY,
            },
          });
        });
        promises.push(request);
      }

      const additionalResponses = await Promise.all(promises);
      additionalResponses.forEach(resp => {
        allPages.push(resp.data);
      });
    }

    const totalShows = allPages.reduce((sum, page) => sum + page.setlist.length, 0);

    logger.info('Successfully fetched artist pages', {
      artist: artist.name,
      pagesRetrieved: allPages.length,
      totalShows: totalShows,
      maxIntended: maxShows
    });

    // Log if we got more shows than intended
    if (totalShows > maxShows) {
      logger.warn('Retrieved more shows than intended', {
        artist: artist.name,
        totalShows,
        maxIntended: maxShows,
        excess: totalShows - maxShows
      });
    }

    return allPages;
  } catch (error) {
    logger.error('Error fetching multiple artist pages', {
      artist: artist.name,
      error: error.message
    });
    throw error;
  }
};


/**
 * Gets tour name from a setlist
 * 
 * @param {string} listID Setlist ID
 * @returns {Object} Band name and tour name
 * @async
 */
const getTourName = async (listID) => {
  logger.info('Requesting tour name', { listID });
  const url = `https://api.setlist.fm/rest/1.0/setlist/${listID}`;
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received tour name data', { listID, bandName: response.data.artist.name });
  return {
    bandName: response.data.artist.name,
    tourName: response.data.tour?.name,
  };
};

/**
 * Gets all songs played during a tour
 * - Fetches all pages of results
 * - Handles rate limiting and retries
 * 
 * @param {string} artistName Artist name
 * @param {string} tourName Tour name
 * @returns {Array} All tour setlist data
 * @async
 */
const getAllTourSongs = async (artistName, tourName) => {
  logger.info('Starting to fetch all tour songs', { artistName, tourName });
  try {
    // Rate-limit the first page request as well.
    const firstResponse = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=1&tourName=${tourName}`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });
    logger.debug('Received first page of setlist data', { artistName, tourName });

    const firstPage = firstResponse.data;
    const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
    const allData = [firstPage];
    await delay(1000);

    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      logger.debug('Scheduling page request', { page: i });
      const request = limiter.schedule(() => {
        const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=${i}&tourName=${tourName}`;
        return axiosGetWithRetry(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
          },
        });
      });
      promises.push(request);
    }

    const additionalResponses = await Promise.all(promises);
    additionalResponses.forEach((resp, index) => {
      logger.debug('Received additional page of setlist data', { page: index + 2 });
      allData.push(resp.data);
    });

    return allData;
  } catch (error) {
    logger.error('Error fetching tour songs', {
      artistName,
      tourName,
      error: error.message,
      statusCode: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
    });
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Internal Server Error',
    };
  }
};

/**
 * Gets all songs played during a tour using MusicBrainz ID
 * - Similar to getAllTourSongs but uses MBID for more precise matching
 * 
 * @param {string} artistName Artist name
 * @param {string} mbid MusicBrainz ID
 * @param {string} tourName Tour name
 * @returns {Array} All tour setlist data
 * @async
 */
const getAllTourSongsByMBID = async (artistName, mbid, tourName) => {
  logger.info('Starting to fetch all tour songs by MBID', { artistName, tourName });
  try {
    const firstResponse = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1&tourName=${tourName}`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });
    logger.debug('Received first page of setlist data', { artistName, tourName });

    const firstPage = firstResponse.data;
    const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
    const allData = [firstPage];
    await delay(1000);

    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      logger.debug('Scheduling page request', { page: i });
      const request = limiter.schedule(() => {
        const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${i}&tourName=${tourName}`;
        return axiosGetWithRetry(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
          },
        });
      });
      promises.push(request);
    }

    const additionalResponses = await Promise.all(promises);
    additionalResponses.forEach((resp, index) => {
      logger.debug('Received additional page of setlist data', { page: index + 2 });
      allData.push(resp.data);
    });

    return allData;
  } catch (error) {
    logger.error('Error fetching tour songs', {
      artistName,
      tourName,
      error: error.message,
      statusCode: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
    });
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Internal Server Error',
    };
  }
};

module.exports = {
  getArtistPageByMBID,
  getArtistPageByName,
  getMultipleArtistPages,
  getTourName,
  getAllTourSongs,
  getAllTourSongsByMBID,
  delay
};
