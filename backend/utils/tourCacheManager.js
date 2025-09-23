/**
 * Tour Cache Manager for Redis
 * Handles caching of tour data from Setlist.fm API to reduce API calls and improve performance
 */

const CACHE_PREFIX = 'tours:';
const CACHE_VERSION = 'v2'; // bump when cached schema/aggregation changes
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds (reasonable for tour data that doesn't change frequently)

/**
 * Generate a cache key for an artist's tour data
 * @param {string} artistName - The artist name
 * @param {string} mbid - MusicBrainz ID (optional but preferred for uniqueness)
 * @returns {string} Cache key
 */
function generateCacheKey(artistName, mbid = null) {
  const baseKey = mbid || artistName.toLowerCase().replace(/\s+/g, '_');
  return `${CACHE_PREFIX}${CACHE_VERSION}:${baseKey}`;
}

/**
 * Get cached tour data from Redis
 * @param {Object} redisClient - Redis client instance
 * @param {string} artistName - The artist name
 * @param {string} mbid - MusicBrainz ID (optional)
 * @returns {Promise<Array|null>} Cached tour data or null if not found/expired
 */
async function getCachedTours(redisClient, artistName, mbid = null) {
  try {
    const cacheKey = generateCacheKey(artistName, mbid);
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for artist tours: ${artistName} (${mbid || 'no mbid'})`);
      return JSON.parse(cachedData);
    }

    console.log(`Cache miss for artist tours: ${artistName} (${mbid || 'no mbid'})`);
    return null;
  } catch (error) {
    console.error('Error retrieving cached tour data:', error);
    return null; // Return null on error to allow fallback to API
  }
}

/**
 * Store tour data in Redis cache
 * @param {Object} redisClient - Redis client instance
 * @param {string} artistName - The artist name
 * @param {string} mbid - MusicBrainz ID (optional)
 * @param {Array} tours - Tour data to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success status
 */
async function cacheTours(redisClient, artistName, mbid = null, tours, ttl = DEFAULT_TTL) {
  try {
    const cacheKey = generateCacheKey(artistName, mbid);
    const dataToCache = JSON.stringify(tours);

    // Store with expiration (Redis v4 syntax)
    await redisClient.setEx(cacheKey, ttl, dataToCache);

    console.log(`Cached tour data for ${artistName} (${mbid || 'no mbid'}) with TTL ${ttl}s`);
    return true;
  } catch (error) {
    console.error('Error caching tour data:', error);
    return false;
  }
}

/**
 * Invalidate cached tour data
 * @param {Object} redisClient - Redis client instance
 * @param {string} artistName - The artist name
 * @param {string} mbid - MusicBrainz ID (optional)
 * @returns {Promise<boolean>} Success status
 */
async function invalidateTourCache(redisClient, artistName, mbid = null) {
  try {
    const cacheKey = generateCacheKey(artistName, mbid);
    const result = await redisClient.del(cacheKey);

    if (result === 1) {
      console.log(`Invalidated cache for ${artistName} (${mbid || 'no mbid'})`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error invalidating tour cache:', error);
    return false;
  }
}

/**
 * Get remaining TTL for cached tour data
 * @param {Object} redisClient - Redis client instance
 * @param {string} artistName - The artist name
 * @param {string} mbid - MusicBrainz ID (optional)
 * @returns {Promise<number>} TTL in seconds, or -1 if not found
 */
async function getTourCacheTTL(redisClient, artistName, mbid = null) {
  try {
    const cacheKey = generateCacheKey(artistName, mbid);
    const ttl = await redisClient.ttl(cacheKey);
    return ttl;
  } catch (error) {
    console.error('Error getting tour cache TTL:', error);
    return -1;
  }
}

module.exports = {
  getCachedTours,
  cacheTours,
  invalidateTourCache,
  getTourCacheTTL,
  DEFAULT_TTL
};