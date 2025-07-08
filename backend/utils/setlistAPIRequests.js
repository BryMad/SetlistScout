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
const getArtistPageByNameRaw = async (artist, page = 1, year = null) => {
  logger.info('Requesting setlist artist page', { artist, page, year });
  const encodedArtistName = encodeURIComponent(artist.name || artist);
  let url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodedArtistName}&p=${page}`;
  
  // Add year parameter if provided
  if (year) {
    url += `&year=${year}`;
  }
  
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received setlist at artist page', { page, year, showCount: response.data.setlist?.length || 0 });
  return response.data;
};

const getArtistPageByMBIDRaw = async (mbid, page = 1, year = null) => {
  logger.info('Requesting setlist artist page by MBID', { mbid, page, year });
  let url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${page}`;
  
  // Add year parameter if provided
  if (year) {
    url += `&year=${year}`;
  }
  
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received setlist at artist page by MBID', { page, year, showCount: response.data.setlist?.length || 0 });
  return response.data;
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
 * Gets multiple pages of artist setlists by MBID
 * - Similar to getMultipleArtistPages but uses MusicBrainz ID
 * 
 * @param {string} mbid MusicBrainz ID
 * @param {number} pageCount Number of pages to fetch (default: 3)
 * @returns {Array} Array of page data
 * @async
 */
const getMultipleArtistPagesByMBID = async (mbid, pageCount = 3) => {
  logger.info('Fetching multiple artist pages by MBID for tour detection', { mbid, pageCount });
  const allPages = [];
  
  try {
    // Fetch first page
    const firstPage = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1`;
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
          const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${i}`;
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
    
    logger.info('Successfully fetched artist pages by MBID', { 
      mbid, 
      pagesRetrieved: allPages.length,
      totalShows: totalShows,
      maxIntended: maxShows
    });
    
    // Log if we got more shows than intended
    if (totalShows > maxShows) {
      logger.warn('Retrieved more shows than intended by MBID', {
        mbid,
        totalShows,
        maxIntended: maxShows,
        excess: totalShows - maxShows
      });
    }
    
    return allPages;
  } catch (error) {
    logger.error('Error fetching multiple artist pages by MBID', {
      mbid,
      error: error.message
    });
    throw error;
  }
};

/**
 * Gets artist setlists using smart pagination strategy
 * - Fetches first page, last page, then middle pages as needed
 * - Stops early if tour names are consistent across pages
 * - Continues searching if different tour names are found
 * 
 * @param {string} artist Artist name
 * @param {number} maxPages Maximum pages to fetch (default: 10)
 * @param {number} year Optional year to filter by (default: null)
 * @returns {Object} Object containing allPages array and tourNamesFound set
 * @async
 */
const getArtistPagesSmartPagination = async (artist, maxPages = 10, year = null) => {
  logger.info('Fetching artist pages with smart pagination', { artist, maxPages, year });
  
  const allPages = [];
  const tourNamesFound = new Set();
  const pagesSearched = new Set();
  
  try {
    // Step 1: Fetch first page to get total pages
    const firstPageData = await getArtistPageByNameRaw(artist, 1, year);
    if (!firstPageData || !firstPageData.setlist || firstPageData.setlist.length === 0) {
      logger.info('No setlists found for artist', { artist, year });
      return { allPages: [], tourNamesFound: new Set() };
    }
    
    allPages.push(firstPageData);
    pagesSearched.add(1);
    
    // Extract tour names from first page
    firstPageData.setlist.forEach(setlist => {
      if (setlist.tour && setlist.tour.name) {
        tourNamesFound.add(setlist.tour.name);
      }
    });
    
    const totalPages = Math.min(firstPageData.total ? Math.ceil(firstPageData.total / 20) : 1, maxPages);
    logger.info('Smart pagination: first page analysis', { 
      artist, 
      totalPages, 
      tourNamesOnFirstPage: tourNamesFound.size,
      firstPageTours: Array.from(tourNamesFound)
    });
    
    // If only one page exists, return early
    if (totalPages <= 1) {
      return { allPages, tourNamesFound };
    }
    
    // Step 2: Fetch last page if it exists and is different from first
    if (totalPages > 1 && !pagesSearched.has(totalPages)) {
      const lastPageData = await getArtistPageByNameRaw(artist, totalPages, year);
      if (lastPageData && lastPageData.setlist && lastPageData.setlist.length > 0) {
        allPages.push(lastPageData);
        pagesSearched.add(totalPages);
        
        // Extract tour names from last page
        const lastPageTours = new Set();
        lastPageData.setlist.forEach(setlist => {
          if (setlist.tour && setlist.tour.name) {
            lastPageTours.add(setlist.tour.name);
            tourNamesFound.add(setlist.tour.name);
          }
        });
        
        logger.info('Smart pagination: last page analysis', {
          artist,
          lastPageTours: Array.from(lastPageTours),
          totalToursFound: tourNamesFound.size
        });
        
        // Check if tour names are consistent between first and last page
        const firstPageTours = new Set();
        firstPageData.setlist.forEach(setlist => {
          if (setlist.tour && setlist.tour.name) {
            firstPageTours.add(setlist.tour.name);
          }
        });
        
        const toursMatch = firstPageTours.size === lastPageTours.size && 
                          [...firstPageTours].every(tour => lastPageTours.has(tour));
        
        if (toursMatch && tourNamesFound.size === 1) {
          logger.info('Smart pagination: early stopping - consistent tour names', {
            artist,
            tourName: Array.from(tourNamesFound)[0],
            pagesSearched: Array.from(pagesSearched)
          });
          return { allPages, tourNamesFound };
        }
      }
    }
    
    // Step 3: Search middle pages if we found different tour names
    if (totalPages > 2 && tourNamesFound.size > 1) {
      const middlePages = [];
      for (let i = 2; i < totalPages; i++) {
        if (!pagesSearched.has(i)) {
          middlePages.push(i);
        }
      }
      
      logger.info('Smart pagination: searching middle pages', {
        artist,
        middlePages: middlePages.slice(0, 5), // Log first 5 middle pages
        totalMiddlePages: middlePages.length
      });
      
      // Search middle pages (limit to prevent excessive API calls)
      const middlePagesToSearch = middlePages.slice(0, Math.min(5, maxPages - 2));
      
      for (const pageNum of middlePagesToSearch) {
        const pageData = await getArtistPageByNameRaw(artist, pageNum, year);
        if (pageData && pageData.setlist && pageData.setlist.length > 0) {
          allPages.push(pageData);
          pagesSearched.add(pageNum);
          
          // Extract tour names from this page
          pageData.setlist.forEach(setlist => {
            if (setlist.tour && setlist.tour.name) {
              tourNamesFound.add(setlist.tour.name);
            }
          });
        }
      }
    }
    
    const totalShows = allPages.reduce((sum, page) => sum + (page.setlist ? page.setlist.length : 0), 0);
    logger.info('Smart pagination: completed', {
      artist,
      pagesSearched: Array.from(pagesSearched).sort((a, b) => a - b),
      totalShows,
      tourNamesFound: Array.from(tourNamesFound),
      totalTours: tourNamesFound.size
    });
    
    return { allPages, tourNamesFound };
    
  } catch (error) {
    logger.error('Error in smart pagination', {
      artist,
      error: error.message,
      pagesSearched: Array.from(pagesSearched)
    });
    throw error;
  }
};

/**
 * Gets artist setlists using smart pagination strategy with MBID
 * - Fetches first page, last page, then middle pages as needed
 * - Stops early if tour names are consistent across pages
 * - Continues searching if different tour names are found
 * 
 * @param {string} mbid Artist MusicBrainz ID
 * @param {number} maxPages Maximum pages to fetch (default: 10)
 * @param {number} year Optional year to filter by (default: null)
 * @returns {Object} Object containing allPages array and tourNamesFound set
 * @async
 */
const getArtistPagesSmartPaginationByMBID = async (mbid, maxPages = 10, year = null) => {
  logger.info('Fetching artist pages with smart pagination by MBID', { mbid, maxPages, year });
  
  const allPages = [];
  const tourNamesFound = new Set();
  const pagesSearched = new Set();
  
  try {
    // Step 1: Fetch first page to get total pages
    const firstPageData = await getArtistPageByMBIDRaw(mbid, 1, year);
    if (!firstPageData || !firstPageData.setlist || firstPageData.setlist.length === 0) {
      logger.info('No setlists found for artist by MBID', { mbid, year });
      return { allPages: [], tourNamesFound: new Set() };
    }
    
    allPages.push(firstPageData);
    pagesSearched.add(1);
    
    // Extract tour names from first page
    firstPageData.setlist.forEach(setlist => {
      if (setlist.tour && setlist.tour.name) {
        tourNamesFound.add(setlist.tour.name);
      }
    });
    
    const totalPages = Math.min(firstPageData.total ? Math.ceil(firstPageData.total / 20) : 1, maxPages);
    logger.info('Smart pagination by MBID: first page analysis', { 
      mbid, 
      totalPages, 
      tourNamesOnFirstPage: tourNamesFound.size,
      firstPageTours: Array.from(tourNamesFound)
    });
    
    // If only one page exists, return early
    if (totalPages <= 1) {
      return { allPages, tourNamesFound };
    }
    
    // Step 2: Fetch last page if it exists and is different from first
    if (totalPages > 1 && !pagesSearched.has(totalPages)) {
      const lastPageData = await getArtistPageByMBIDRaw(mbid, totalPages, year);
      if (lastPageData && lastPageData.setlist && lastPageData.setlist.length > 0) {
        allPages.push(lastPageData);
        pagesSearched.add(totalPages);
        
        // Extract tour names from last page
        const lastPageTours = new Set();
        lastPageData.setlist.forEach(setlist => {
          if (setlist.tour && setlist.tour.name) {
            lastPageTours.add(setlist.tour.name);
            tourNamesFound.add(setlist.tour.name);
          }
        });
        
        logger.info('Smart pagination by MBID: last page analysis', {
          mbid,
          lastPageTours: Array.from(lastPageTours),
          totalToursFound: tourNamesFound.size
        });
        
        // Check if tour names are consistent between first and last page
        const firstPageTours = new Set();
        firstPageData.setlist.forEach(setlist => {
          if (setlist.tour && setlist.tour.name) {
            firstPageTours.add(setlist.tour.name);
          }
        });
        
        const toursMatch = firstPageTours.size === lastPageTours.size && 
                          [...firstPageTours].every(tour => lastPageTours.has(tour));
        
        if (toursMatch && tourNamesFound.size === 1) {
          logger.info('Smart pagination by MBID: early stopping - consistent tour names', {
            mbid,
            tourName: Array.from(tourNamesFound)[0],
            pagesSearched: Array.from(pagesSearched)
          });
          return { allPages, tourNamesFound };
        }
      }
    }
    
    // Step 3: Search middle pages if we found different tour names
    if (totalPages > 2 && tourNamesFound.size > 1) {
      const middlePages = [];
      for (let i = 2; i < totalPages; i++) {
        if (!pagesSearched.has(i)) {
          middlePages.push(i);
        }
      }
      
      logger.info('Smart pagination by MBID: searching middle pages', {
        mbid,
        middlePages: middlePages.slice(0, 5), // Log first 5 middle pages
        totalMiddlePages: middlePages.length
      });
      
      // Search middle pages (limit to prevent excessive API calls)
      const middlePagesToSearch = middlePages.slice(0, Math.min(5, maxPages - 2));
      
      for (const pageNum of middlePagesToSearch) {
        const pageData = await getArtistPageByMBIDRaw(mbid, pageNum, year);
        if (pageData && pageData.setlist && pageData.setlist.length > 0) {
          allPages.push(pageData);
          pagesSearched.add(pageNum);
          
          // Extract tour names from this page
          pageData.setlist.forEach(setlist => {
            if (setlist.tour && setlist.tour.name) {
              tourNamesFound.add(setlist.tour.name);
            }
          });
        }
      }
    }
    
    const totalShows = allPages.reduce((sum, page) => sum + (page.setlist ? page.setlist.length : 0), 0);
    logger.info('Smart pagination by MBID: completed', {
      mbid,
      pagesSearched: Array.from(pagesSearched).sort((a, b) => a - b),
      totalShows,
      tourNamesFound: Array.from(tourNamesFound),
      totalTours: tourNamesFound.size
    });
    
    return { allPages, tourNamesFound };
    
  } catch (error) {
    logger.error('Error in smart pagination by MBID', {
      mbid,
      error: error.message,
      pagesSearched: Array.from(pagesSearched)
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
  getMultipleArtistPagesByMBID,
  getArtistPagesSmartPagination,
  getArtistPagesSmartPaginationByMBID,
  getTourName, 
  getAllTourSongs, 
  getAllTourSongsByMBID, 
  delay 
};
