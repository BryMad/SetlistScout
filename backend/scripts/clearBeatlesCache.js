#!/usr/bin/env node

/**
 * Script to clear Beatles-related cache entries
 * Run with: node backend/scripts/clearBeatlesCache.js
 */

const redis = require('redis');

async function clearBeatlesCache() {
  const client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  });

  try {
    await client.connect();
    console.log('Connected to Redis');

    // Get all keys that might be related to Beatles
    const allKeys = await client.keys('*');
    const beatlesKeys = allKeys.filter(key => 
      key.toLowerCase().includes('beatles') || 
      key.toLowerCase().includes('guitar') ||
      key.toLowerCase().includes('project')
    );

    console.log('Found potential Beatles-related keys:', beatlesKeys);

    if (beatlesKeys.length > 0) {
      // Delete all Beatles-related keys
      await client.del(beatlesKeys);
      console.log(`Cleared ${beatlesKeys.length} cache entries`);
    } else {
      console.log('No Beatles-related cache entries found');
    }

    // Also clear any artist slug cache for "the beatles"
    const slugKey = 'artist:slug:the beatles';
    const slugExists = await client.exists(slugKey);
    if (slugExists) {
      await client.del(slugKey);
      console.log('Cleared artist slug cache for "the beatles"');
    }

  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    await client.quit();
  }
}

if (require.main === module) {
  clearBeatlesCache();
}

module.exports = clearBeatlesCache;