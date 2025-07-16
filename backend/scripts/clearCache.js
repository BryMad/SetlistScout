#!/usr/bin/env node

/**
 * Script to clear Redis cache entries that may have been corrupted by the bug
 * where basic search created incomplete tour caches
 */

const redis = require('redis');
require('dotenv').config();

async function clearTourCache() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  try {
    await client.connect();
    console.log('Connected to Redis');

    // Get all artist cache keys
    const artistKeys = await client.keys('artist:*');
    console.log(`Found ${artistKeys.length} artist cache keys`);

    if (artistKeys.length > 0) {
      console.log('Artist cache keys:');
      artistKeys.forEach(key => console.log(`  - ${key}`));
      
      // Delete all artist cache keys
      const deleted = await client.del(artistKeys);
      console.log(`Deleted ${deleted} cache entries`);
    } else {
      console.log('No artist cache keys found');
    }

    // Also clear any session data if needed (optional)
    const sessionKeys = await client.keys('sess:*');
    console.log(`Found ${sessionKeys.length} session keys (keeping these)`);

  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    await client.disconnect();
    console.log('Disconnected from Redis');
  }
}

// Run the script
clearTourCache().catch(console.error);