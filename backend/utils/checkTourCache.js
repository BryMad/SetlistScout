/**
 * Utility script to check tour cache in Redis
 */
require('dotenv').config();
const { createClient } = require('redis');
const { getCachedTours, getTourCacheTTL } = require('./tourCacheManager');

async function checkCache(artistName, mbid = null) {
  const redisClient = createClient({
    url: process.env.REDIS_URL
  });

  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    // Check if tours are cached
    const cachedTours = await getCachedTours(redisClient, artistName, mbid);
    
    if (cachedTours) {
      console.log(`\nFound cached tours for "${artistName}"${mbid ? ` (MBID: ${mbid})` : ''}`);
      console.log(`Number of tours: ${cachedTours.length}`);
      console.log('\nCached tours:');
      cachedTours.forEach((tour, index) => {
        console.log(`${index + 1}. ${tour.name || tour.displayName} - ${tour.showCount} shows`);
      });

      // Check TTL
      const ttl = await getTourCacheTTL(redisClient, artistName, mbid);
      if (ttl > 0) {
        const hours = Math.floor(ttl / 3600);
        const minutes = Math.floor((ttl % 3600) / 60);
        console.log(`\nCache expires in: ${hours}h ${minutes}m`);
      }
    } else {
      console.log(`\nNo cached tours found for "${artistName}"${mbid ? ` (MBID: ${mbid})` : ''}`);
    }

    // List all tour cache keys
    console.log('\n--- All cached tour keys ---');
    const keys = await redisClient.keys('tours:*');
    if (keys.length > 0) {
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        console.log(`${key} (expires in ${Math.floor(ttl / 3600)}h)`);
      }
    } else {
      console.log('No tour cache entries found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await redisClient.quit();
  }
}

// Command line usage
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node checkTourCache.js <artistName> [mbid]');
  console.log('Example: node checkTourCache.js "Pearl Jam"');
  console.log('Example: node checkTourCache.js "Pearl Jam" "83b9cbe7-9857-49e2-ab8e-b57b01038103"');
  process.exit(1);
}

const artistName = args[0];
const mbid = args[1] || null;

checkCache(artistName, mbid);