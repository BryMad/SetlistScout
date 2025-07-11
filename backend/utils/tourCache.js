const { createClient } = require('redis');

class TourCache {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  /**
   * Cache an artist slug (permanent)
   */
  async cacheArtistSlug(artistName, slug) {
    const key = `artist:slug:${artistName.toLowerCase()}`;
    await this.redis.set(key, slug);
  }

  /**
   * Get cached artist slug
   */
  async getCachedSlug(artistName) {
    const key = `artist:slug:${artistName.toLowerCase()}`;
    return await this.redis.get(key);
  }

  /**
   * Cache tours for an artist (permanent with metadata)
   * Filters out invalid tour names before caching
   */
  async cacheTours(artistSlug, tours) {
    const key = `artist:tours:${artistSlug}`;
    
    // Filter out invalid tours before caching
    const validTours = tours.filter(tour => this.isValidTour(tour));
    
    const toursData = {
      tours: validTours,
      lastUpdated: new Date().toISOString(),
      lastChecked: Date.now(),
      cachedAt: Date.now(),
      originalCount: tours.length,
      filteredCount: validTours.length
    };
    await this.redis.set(key, JSON.stringify(toursData));
    
    if (tours.length !== validTours.length) {
      console.log(`Filtered out ${tours.length - validTours.length} invalid tours for ${artistSlug}`);
    }
  }
  
  /**
   * Check if a tour object is valid for caching
   */
  isValidTour(tour) {
    if (!tour || !tour.name) {
      return false;
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
      'Null'
    ];

    // Check exact matches (case insensitive)
    const lowerTourName = tour.name.toLowerCase().trim();
    if (invalidTourNames.some(invalid => 
      lowerTourName === invalid.toLowerCase()
    )) {
      return false;
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
      /^null$/i,
      /^\s*$/  // Empty or whitespace only
    ];

    if (invalidPatterns.some(pattern => pattern.test(tour.name))) {
      return false;
    }

    // Also check if show count is suspiciously low (might indicate data issues)
    if (tour.showCount !== undefined && tour.showCount < 1) {
      return false;
    }

    return true;
  }
  
  /**
   * Update last checked time without re-scraping
   */
  async updateLastChecked(artistSlug) {
    const key = `artist:tours:${artistSlug}`;
    const data = await this.redis.get(key);
    if (data) {
      const toursData = JSON.parse(data);
      toursData.lastChecked = Date.now();
      await this.redis.set(key, JSON.stringify(toursData));
    }
  }

  /**
   * Get cached tours
   */
  async getCachedTours(artistSlug) {
    const key = `artist:tours:${artistSlug}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Check if we need to update tours based on recent setlists
   * This is the smart part - we check if there's a new tour we don't know about
   */
  async shouldUpdateTours(artistSlug, currentTourFromAPI, cachedTours) {
    if (!cachedTours) return true;

    // Only check periodically, not every time
    const timeSinceLastCheck = Date.now() - (cachedTours.lastChecked || cachedTours.cachedAt);
    const MIN_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour minimum between checks
    
    if (timeSinceLastCheck < MIN_CHECK_INTERVAL) {
      // Too soon, don't check again
      return false;
    }

    // Check if the current tour from the API exists in our cached tours
    const tourExists = cachedTours.tours.some(tour => 
      tour.name === currentTourFromAPI || 
      tour.id === currentTourFromAPI
    );

    // If we found a tour that's not in our cache, we should update
    return !tourExists;
  }
  
  /**
   * Determine if we should even check the API based on activity patterns
   */
  shouldCheckAPI(cachedData) {
    if (!cachedData) return true;
    
    const hoursSinceLastCheck = (Date.now() - cachedData.lastChecked) / (1000 * 60 * 60);
    const daysSinceCached = (Date.now() - cachedData.cachedAt) / (1000 * 60 * 60 * 24);
    
    // Different check frequencies based on artist activity
    if (daysSinceCached < 7) {
      // New cache entry - check every 6 hours
      return hoursSinceLastCheck >= 6;
    } else if (daysSinceCached < 30) {
      // Recent activity - check daily
      return hoursSinceLastCheck >= 24;
    } else if (daysSinceCached < 180) {
      // Moderate activity - check weekly
      return hoursSinceLastCheck >= 168;
    } else {
      // Old cache - check monthly
      return hoursSinceLastCheck >= 720;
    }
  }

  /**
   * Merge new tour info with cached tours
   */
  mergeTours(cachedTours, newTourInfo) {
    const existingTourIndex = cachedTours.findIndex(
      tour => tour.id === newTourInfo.id
    );

    if (existingTourIndex >= 0) {
      // Update show count if it's increased
      if (newTourInfo.showCount > cachedTours[existingTourIndex].showCount) {
        cachedTours[existingTourIndex].showCount = newTourInfo.showCount;
      }
    } else {
      // Add new tour at the beginning (most recent)
      cachedTours.unshift(newTourInfo);
    }

    return cachedTours;
  }

  /**
   * Get popular artists (for pre-warming cache)
   */
  async getPopularArtists() {
    // Could track search frequency and return most searched artists
    const key = 'stats:popular_artists';
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Track artist search for popularity
   */
  async trackArtistSearch(artistName) {
    const key = `stats:artist_searches`;
    await this.redis.zIncrBy(key, 1, artistName.toLowerCase());
  }
}

module.exports = TourCache;