const axios = require('axios');
const Bottleneck = require('bottleneck');

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
 * @returns {Promise<Array>} Array of tour objects with name, year, and show count
 */
async function fetchAllToursFromAPI(artistName, mbid = null, onProgress = null) {
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

module.exports = {
  fetchAllToursFromAPI
};