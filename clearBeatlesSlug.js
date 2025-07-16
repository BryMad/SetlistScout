#!/usr/bin/env node

const redis = require('redis');
require('dotenv').config();

async function clearBeatlesSlug() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  try {
    await client.connect();
    console.log('Connected to Redis');

    // Clear the specific Beatles slug cache
    const key = 'artist:slug:the beatles';
    const existed = await client.exists(key);
    
    if (existed) {
      const currentSlug = await client.get(key);
      console.log('Current cached slug for The Beatles:', currentSlug);
      
      await client.del(key);
      console.log('Cleared cached slug for The Beatles');
    } else {
      console.log('No cached slug found for The Beatles');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

clearBeatlesSlug();