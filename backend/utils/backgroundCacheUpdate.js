const TourCache = require('./tourCache');

/**
 * Background cache updater that runs after live shows data is delivered
 * This doesn't slow down the user experience but keeps cache fresh
 */
class BackgroundCacheUpdater {
  constructor(redisClient) {
    this.tourCache = new TourCache(redisClient);
    this.scraperUrl = process.env.SCRAPER_SERVICE_URL;
    this.scraperApiKey = process.env.SCRAPER_API_KEY;
  }

  /**
   * Check and update cache after live shows workflow completes
   * This runs asynchronously without blocking the user response
   * 
   * IMPORTANT: This only updates EXISTING caches. It does not create new caches
   * to prevent incomplete cache entries (only current tour instead of all tours).
   * New caches should only be created from advanced search with complete tour data.
   */
  async updateCacheAfterLiveShows(artist, tourName, artistSlug, mbid = null) {
    try {
      // Don't cache invalid tour names
      if (this.isInvalidTourName(tourName)) {
        console.log(`Skipping cache update for invalid tour: ${tourName}`);
        return;
      }

      console.log(`Background cache update starting for ${artist.name} (${tourName})`);

      // Cache the artist slug if we don't have it
      const cachedSlug = await this.tourCache.getCachedSlug(artist.name, mbid);
      if (!cachedSlug && artistSlug) {
        await this.tourCache.cacheArtistSlug(artist.name, artistSlug, mbid);
        console.log(`  - Cached new slug: ${artistSlug} ${mbid ? `(MBID: ${mbid})` : '(name only)'}`);
      }

      // Check if we have tours cached for this artist
      const useSlug = artistSlug || cachedSlug;
      if (!useSlug) {
        console.log(`  - No slug available for ${artist.name}, skipping tour cache`);
        return;
      }

      const cachedTours = await this.tourCache.getCachedTours(useSlug);
      
      if (!cachedTours) {
        // No cache exists - DO NOT create from basic search
        // Cache should only be created from advanced search with ALL tours
        console.log(`  - No cache exists for ${artist.name}, skipping cache creation from basic search`);
        return;
      } else {
        // Check if this tour exists in cache
        const tourExists = cachedTours.tours.some(tour => 
          tour.name === tourName || 
          tour.id === tourName
        );

        if (!tourExists) {
          console.log(`  - New tour "${tourName}" detected, updating cache`);
          await this.fetchAndCacheAllTours(useSlug);
        } else {
          // Tour exists, just update the last checked time
          await this.tourCache.updateLastChecked(useSlug);
          console.log(`  - Tour exists in cache, updated last checked time`);
        }
      }

    } catch (error) {
      console.error('Background cache update failed:', error.message);
      // Don't throw - this is background work, shouldn't affect user experience
    }
  }

  /**
   * Check if a tour name should not be cached
   */
  isInvalidTourName(tourName) {
    if (!tourName || typeof tourName !== 'string') {
      return true;
    }

    const invalidTourNames = [
      'No Tour Info',  // This is the actual string used in the live shows workflow
      'No Tour Data', 
      'No tour',
      'No tours',
      '', // Empty string (also returned by chooseTour when no tour found)
      'Unknown',
      'Miscellaneous',
      'Various',
      'Other',
      'Untitled',
      'N/A',
      'TBD',
      'Null',
      null,
      undefined
    ];

    // Check exact matches (case insensitive)
    const lowerTourName = tourName.toLowerCase().trim();
    if (invalidTourNames.some(invalid => 
      invalid && lowerTourName === invalid.toLowerCase()
    )) {
      return true;
    }

    // Check for patterns that indicate "no tour data"
    const invalidPatterns = [
      /^no\s+tour/i,
      /^unknown/i,
      /^misc/i,
      /^various/i,
      /^other/i,
      /^n\/a$/i,
      /^tbd$/i,
      /^null$/i
    ];

    return invalidPatterns.some(pattern => pattern.test(lowerTourName));
  }

  /**
   * Fetch all tours from scraper and cache them
   */
  async fetchAndCacheAllTours(artistSlug) {
    try {
      const axios = require('axios');
      
      const response = await axios.get(`${this.scraperUrl}/api/tours/${artistSlug}`, {
        headers: { 'X-API-Key': this.scraperApiKey },
        timeout: 30000
      });

      if (response.data && response.data.tours && response.data.tours.length > 0) {
        await this.tourCache.cacheTours(artistSlug, response.data.tours);
        console.log(`  - Cached ${response.data.tours.length} tours`);
        return true;
      } else {
        console.log(`  - No tours returned from scraper`);
        return false;
      }
    } catch (error) {
      console.error(`  - Failed to fetch tours: ${error.message}`);
      return false;
    }
  }

  /**
   * Static method to easily trigger background update
   */
  static async triggerUpdate(redisClient, artist, tourName, artistSlug, mbid = null) {
    const updater = new BackgroundCacheUpdater(redisClient);
    
    // Run asynchronously without blocking
    setImmediate(() => {
      updater.updateCacheAfterLiveShows(artist, tourName, artistSlug, mbid);
    });
  }
}

module.exports = BackgroundCacheUpdater;