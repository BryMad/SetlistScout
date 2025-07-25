const axios = require('axios');
const Bottleneck = require('bottleneck');
const { getCachedTours, cacheTours } = require('./tourCacheManager');

// Rate limiter for Setlist.fm API (16 requests per second)
const limiter = new Bottleneck({
  minTime: 63, // ~16 requests per second
  maxConcurrent: 5
});

/**
 * Fetches all tours for an artist by paginating through their setlists
 * and extracting unique tour information with years
 * @param {string} artistName - The artist name to search for
 * @param {string} mbid - Optional MusicBrainz ID for more accurate matching
 * @param {function} onProgress - Optional callback for progress updates
 * @param {Object} redisClient - Optional Redis client for caching
 * @returns {Promise<Array>} Array of tour objects with name, year, and show count
 */
async function fetchAllToursFromAPI(artistName, mbid = null, onProgress = null, redisClient = null) {
  // Check cache first if Redis client is provided
  if (redisClient) {
    const cachedTours = await getCachedTours(redisClient, artistName, mbid);
    if (cachedTours) {
      console.log(`Returning cached tours for ${artistName}`);
      return cachedTours;
    }
  }
  const tours = new Map(); // Use Map to track unique tours
  const SETLIST_API_KEY = process.env.SETLIST_API_KEY;
  
  if (!SETLIST_API_KEY) {
    throw new Error('SETLIST_API_KEY environment variable is not set');
  }
  
  const headers = {
    'x-api-key': SETLIST_API_KEY,
    'Accept': 'application/json'
  };

  let page = 1;
  let totalPages = 1;
  let processedShows = 0;

  try {
    // Build query params - use artistMbid when available for more accurate results
    const params = mbid 
      ? { artistMbid: mbid, p: page }
      : { artistName: artistName, p: page }; // Don't double-encode, axios will handle it
    
    console.log(`Starting tour extraction for ${artistName} with MBID: ${mbid}`);

    do {
      // Make rate-limited API call
      const response = await limiter.schedule(async () => {
        const url = 'https://api.setlist.fm/rest/1.0/search/setlists';
        const requestParams = { ...params, p: page };
        console.log(`Fetching page ${page}/${totalPages || '?'} for ${artistName}`);
        
        try {
          return await axios.get(url, {
            params: requestParams,
            headers,
            timeout: 30000
          });
        } catch (apiError) {
          console.error(`API request failed for ${artistName} page ${page}:`, apiError.message);
          throw apiError;
        }
      });

      const data = response.data;
      
      // Check if response has expected structure
      if (!data || typeof data.total === 'undefined' || typeof data.itemsPerPage === 'undefined') {
        console.error(`Invalid API response structure for ${artistName}:`, data);
        break; // Exit pagination loop
      }
      
      totalPages = Math.ceil(data.total / data.itemsPerPage);
      
      // Process setlists on this page
      if (data.setlist && Array.isArray(data.setlist)) {
        for (const setlist of data.setlist) {
          processedShows++;
          
          if (setlist.tour && setlist.tour.name) {
            const tourName = setlist.tour.name;
            const year = setlist.eventDate ? new Date(setlist.eventDate.split('-').reverse().join('-')).getFullYear() : null;
            
            // Create unique key for tour+year combination
            const tourKey = `${tourName}_${year || 'unknown'}`;
            
            if (!tours.has(tourKey)) {
              tours.set(tourKey, {
                name: tourName,
                year: year,
                showCount: 0,
                firstDate: setlist.eventDate,
                lastDate: setlist.eventDate
              });
            }
            
            // Update tour info
            const tour = tours.get(tourKey);
            tour.showCount++;
            
            // Update date range
            if (setlist.eventDate) {
              if (setlist.eventDate < tour.firstDate) {
                tour.firstDate = setlist.eventDate;
              }
              if (setlist.eventDate > tour.lastDate) {
                tour.lastDate = setlist.eventDate;
              }
            }
          }
        }
      }

      // Send progress update if callback provided
      if (onProgress) {
        onProgress({
          currentPage: page,
          totalPages,
          processedShows,
          toursFound: tours.size
        });
      }

      page++;
    } while (page <= totalPages);

    // Convert Map to sorted array
    const tourArray = Array.from(tours.values())
      .filter(tour => tour.name && !isInvalidTourName(tour.name))
      .sort((a, b) => {
        // Sort by year descending, then by show count
        if (a.year && b.year && a.year !== b.year) {
          return b.year - a.year;
        }
        return b.showCount - a.showCount;
      });

    console.log(`Found ${tourArray.length} valid tours for ${artistName} from ${processedShows} shows`);
    
    // Cache the results if Redis client is provided
    if (redisClient && tourArray.length > 0) {
      await cacheTours(redisClient, artistName, mbid, tourArray);
    }
    
    return tourArray;

  } catch (error) {
    console.error(`Error fetching tours for ${artistName}:`, error.message);
    throw error;
  }
}

/**
 * Checks if a tour name should be filtered out
 */
function isInvalidTourName(tourName) {
  const invalidPatterns = [
    /^no tour info$/i,
    /^unknown$/i,
    /^miscellaneous$/i,
    /^various$/i,
    /^n\/a$/i,
    /^\s*$/
  ];

  return invalidPatterns.some(pattern => pattern.test(tourName));
}

/**
 * Streaming version that emits tours via SSE as they are discovered
 * Only includes tours that have at least one show with song data
 * @param {string} artistName - The artist name to search for
 * @param {string} mbid - Optional MusicBrainz ID for more accurate matching
 * @param {string} clientId - SSE client ID for sending updates
 * @param {Object} redisClient - Optional Redis client for caching
 * @returns {Promise<void>} Resolves when all pages have been processed
 */
async function fetchAllToursFromAPIStream(artistName, mbid = null, clientId, redisClient = null) {
  const sseManager = require('./sseManager');
  
  // Check cache first if Redis client is provided
  if (redisClient) {
    const cachedTours = await getCachedTours(redisClient, artistName, mbid);
    if (cachedTours && cachedTours.length > 0) {
      console.log(`Streaming cached tours for ${artistName}`);
      
      // Stream cached tours immediately
      sseManager.sendUpdate(clientId, 'tour_search_start', 'Loading cached tour data...', 15);
      
      // Send all cached tours at once
      for (const tour of cachedTours) {
        sseManager.sendUpdate(clientId, 'tour_discovered', `Found tour: ${tour.name}`, null, {
          type: 'new_tour',
          tour: formatTourForDisplay(tour)
        });
      }
      
      // Send completion
      sseManager.sendUpdate(clientId, 'tour_search_complete', 
        `Loaded ${cachedTours.length} tours from cache`, 
        100,
        {
          type: 'search_complete',
          summary: {
            toursFound: cachedTours.length,
            fromCache: true
          }
        }
      );
      
      return; // Exit early with cached data
    }
  }
  const tours = new Map(); // Use Map to track unique tours by name only
  const SETLIST_API_KEY = process.env.SETLIST_API_KEY;
  
  if (!SETLIST_API_KEY) {
    throw new Error('SETLIST_API_KEY environment variable is not set');
  }
  
  const headers = {
    'x-api-key': SETLIST_API_KEY,
    'Accept': 'application/json'
  };

  let page = 1;
  let totalPages = 1;
  let processedShows = 0;
  let showsWithSongs = 0;

  try {
    // Build query params
    const params = mbid 
      ? { artistMbid: mbid, p: page }
      : { artistName: artistName, p: page };
    
    console.log(`Starting streaming tour extraction for ${artistName} with MBID: ${mbid}`);
    
    // Send initial progress
    sseManager.sendUpdate(clientId, 'tour_search_start', 'Starting tour search...', 15);

    do {
      // Make rate-limited API call
      const response = await limiter.schedule(async () => {
        const url = 'https://api.setlist.fm/rest/1.0/search/setlists';
        const requestParams = { ...params, p: page };
        
        // Send page progress
        const progressMessage = totalPages > 1 
          ? `Scanning page ${page} of ${totalPages}...`
          : `Scanning page ${page}...`;
        const progress = 15 + (page / Math.max(totalPages, 1)) * 70;
        sseManager.sendUpdate(clientId, 'page_progress', progressMessage, Math.min(progress, 85));
        
        try {
          return await axios.get(url, {
            params: requestParams,
            headers,
            timeout: 30000
          });
        } catch (apiError) {
          console.error(`API request failed for ${artistName} page ${page}:`, apiError.message);
          throw apiError;
        }
      });

      const data = response.data;
      
      // Check if response has expected structure
      if (!data || typeof data.total === 'undefined' || typeof data.itemsPerPage === 'undefined') {
        console.error(`Invalid API response structure for ${artistName}:`, data);
        break;
      }
      
      totalPages = Math.ceil(data.total / data.itemsPerPage);
      
      // Process setlists on this page
      if (data.setlist && Array.isArray(data.setlist)) {
        for (const setlist of data.setlist) {
          processedShows++;
          
          // Check if this show has song data
          const hasSongs = setlist.sets?.set?.length > 0;
          
          if (hasSongs && setlist.tour && setlist.tour.name && !isInvalidTourName(setlist.tour.name)) {
            showsWithSongs++;
            const tourName = setlist.tour.name;
            const eventDate = setlist.eventDate;
            const year = eventDate ? new Date(eventDate.split('-').reverse().join('-')).getFullYear() : null;
            
            // Use tour name as key (not tour+year)
            if (!tours.has(tourName)) {
              // New tour discovered
              const newTour = {
                name: tourName,
                showCount: 1,
                firstDate: eventDate,
                lastDate: eventDate,
                firstYear: year,
                lastYear: year
              };
              
              tours.set(tourName, newTour);
              
              // Emit new tour discovery
              sseManager.sendUpdate(clientId, 'tour_discovered', `Found tour: ${newTour.name}`, null, {
                type: 'new_tour',
                tour: formatTourForDisplay(newTour)
              });
            } else {
              // Update existing tour
              const tour = tours.get(tourName);
              tour.showCount++;
              
              let dateRangeChanged = false;
              
              // Update date range
              if (eventDate) {
                if (!tour.firstDate || eventDate < tour.firstDate) {
                  tour.firstDate = eventDate;
                  tour.firstYear = year;
                  dateRangeChanged = true;
                }
                if (!tour.lastDate || eventDate > tour.lastDate) {
                  tour.lastDate = eventDate;
                  tour.lastYear = year;
                  dateRangeChanged = true;
                }
              }
              
              // Emit tour update if date range changed or every 10 shows
              if (dateRangeChanged || tour.showCount % 10 === 0) {
                const updateMessage = dateRangeChanged 
                  ? `Updated date range for ${tour.name}` 
                  : `${tour.name} now has ${tour.showCount} shows`;
                sseManager.sendUpdate(clientId, 'tour_updated', updateMessage, null, {
                  type: 'tour_update',
                  tour: formatTourForDisplay(tour)
                });
              }
            }
          }
        }
      }

      page++;
    } while (page <= totalPages);

    // Convert tours Map to array for caching
    const tourArray = Array.from(tours.values()).map(tour => formatTourForDisplay(tour));
    
    // Cache the results if Redis client is provided and we found tours
    if (redisClient && tourArray.length > 0) {
      await cacheTours(redisClient, artistName, mbid, tourArray);
    }
    
    // Send completion with summary
    console.log(`Streaming complete: Found ${tours.size} tours with songs from ${showsWithSongs}/${processedShows} shows`);
    
    sseManager.sendUpdate(clientId, 'tour_search_complete', 
      `Found ${tours.size} tours from ${showsWithSongs} shows with setlists`, 
      100,
      {
        type: 'search_complete',
        summary: {
          toursFound: tours.size,
          totalShows: processedShows,
          showsWithSongs: showsWithSongs
        }
      }
    );

  } catch (error) {
    console.error(`Error in streaming tour fetch for ${artistName}:`, error.message);
    throw error;
  }
}

/**
 * Formats a tour object for display in the frontend
 */
function formatTourForDisplay(tour) {
  let displayYear = '';
  if (tour.firstYear && tour.lastYear) {
    if (tour.firstYear === tour.lastYear) {
      displayYear = tour.firstYear.toString();
    } else {
      displayYear = `${tour.firstYear}-${tour.lastYear}`;
    }
  }
  
  return {
    name: tour.name,
    displayName: displayYear ? `${tour.name} (${displayYear})` : tour.name,
    showCount: tour.showCount,
    year: displayYear,
    firstDate: tour.firstDate,
    lastDate: tour.lastDate
  };
}

module.exports = {
  fetchAllToursFromAPI,
  fetchAllToursFromAPIStream
};