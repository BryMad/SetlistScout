// Example implementation of the tours endpoint with smart caching

/**
 * Smart tour fetching with cache
 * This minimizes scraping by:
 * 1. Checking if we have cached tours
 * 2. Using the setlist.fm API to see if there's a new tour
 * 3. Only scraping if we detect a new tour
 */
router.get('/artist/:artistId/tours', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artistName = decodeURIComponent(artistId);
    const { mbid } = req.query;
    
    // Initialize tour cache with Redis client
    const tourCache = new TourCache(req.app.locals.redisClient);
    
    // Track this search for popularity
    await tourCache.trackArtistSearch(artistName);
    
    // Step 1: Check for cached slug
    let artistSlug = await tourCache.getCachedSlug(artistName);
    
    if (!artistSlug) {
      // Get slug from setlist.fm API and cache it
      artistSlug = await getSetlistSlug({ name: artistName }, mbid);
      
      if (!artistSlug) {
        return res.json({ 
          tours: [], 
          artistSlug: null,
          message: 'Artist not found on setlist.fm'
        });
      }
      
      // Cache the slug for future use
      await tourCache.cacheArtistSlug(artistName, artistSlug);
    }
    
    // Step 2: Check for cached tours
    const cachedData = await tourCache.getCachedTours(artistSlug);
    
    if (cachedData && cachedData.tours) {
      // Step 3: Check if we need to update by looking at recent setlists
      try {
        // Get the most recent tour info from the API (this is a legitimate API call)
        const artistPage = await getArtistPageByName({ name: artistName });
        const tourInfo = getTour(artistPage);
        const currentTourName = chooseTour(tourInfo, artistName);
        
        // Check if this tour exists in our cache
        const shouldUpdate = await tourCache.shouldUpdateTours(
          artistSlug, 
          currentTourName, 
          cachedData
        );
        
        if (!shouldUpdate) {
          // Cache is still good, return it
          console.log(`Returning cached tours for ${artistName} (cache hit)`);
          return res.json({
            tours: cachedData.tours,
            artistSlug: artistSlug,
            cached: true,
            cacheAge: Math.floor((Date.now() - cachedData.cachedAt) / 1000 / 60) + ' minutes'
          });
        }
        
        // We detected a new tour, need to update
        console.log(`New tour detected for ${artistName}, updating cache`);
        
      } catch (apiError) {
        // If API check fails, return cached data anyway
        console.log('API check failed, returning cached data');
        return res.json({
          tours: cachedData.tours,
          artistSlug: artistSlug,
          cached: true,
          cacheAge: Math.floor((Date.now() - cachedData.cachedAt) / 1000 / 60) + ' minutes'
        });
      }
    }
    
    // Step 4: No cache or cache needs update - fetch from scraper
    console.log(`Fetching fresh tours for ${artistName} from scraper`);
    const tours = await fetchToursFromService(artistSlug);
    
    if (tours.length > 0) {
      // Cache the tours for future use
      await tourCache.cacheTours(artistSlug, tours);
    }
    
    return res.json({
      tours: tours,
      artistSlug: artistSlug,
      cached: false
    });
    
  } catch (error) {
    console.error('Error in /artist/:artistId/tours route:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
});