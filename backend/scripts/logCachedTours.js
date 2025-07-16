#!/usr/bin/env node

/**
 * Script to log all cached tours in Redis
 * Shows detailed information about what's currently cached
 */

const redis = require('redis');
require('dotenv').config();

async function logCachedTours() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  try {
    await client.connect();
    console.log('Connected to Redis');
    console.log('='.repeat(60));

    // Get all artist-related keys
    const artistKeys = await client.keys('artist:*');
    console.log(`Found ${artistKeys.length} total artist cache keys\n`);

    if (artistKeys.length === 0) {
      console.log('No cached data found');
      return;
    }

    // Separate slug keys and tour keys
    const slugKeys = artistKeys.filter(key => key.includes(':slug:'));
    const tourKeys = artistKeys.filter(key => key.includes(':tours:'));

    console.log(`📍 ARTIST SLUG MAPPINGS (${slugKeys.length}):`);
    console.log('─'.repeat(40));
    for (const key of slugKeys) {
      const slug = await client.get(key);
      const artistName = key.replace('artist:slug:', '');
      console.log(`  ${artistName} → ${slug}`);
    }

    console.log(`\n🎵 CACHED TOUR DATA (${tourKeys.length}):`);
    console.log('─'.repeat(40));
    
    for (const key of tourKeys) {
      const data = await client.get(key);
      if (data) {
        const tourData = JSON.parse(data);
        const artistSlug = key.replace('artist:tours:', '');
        
        console.log(`\n🎤 ${artistSlug.toUpperCase()}`);
        console.log(`   Cache created: ${new Date(tourData.cachedAt).toLocaleString()}`);
        console.log(`   Last updated: ${new Date(tourData.lastUpdated).toLocaleString()}`);
        console.log(`   Last checked: ${new Date(tourData.lastChecked).toLocaleString()}`);
        console.log(`   Tours found: ${tourData.tours.length}`);
        console.log(`   Original count: ${tourData.originalCount || 'N/A'}`);
        console.log(`   Filtered count: ${tourData.filteredCount || 'N/A'}`);
        
        if (tourData.tours.length > 0) {
          console.log(`   Tour list:`);
          tourData.tours.forEach((tour, index) => {
            const showCount = tour.showCount || tour.shows || 'N/A';
            console.log(`     ${index + 1}. ${tour.name} (${showCount} shows)`);
          });
        }
        
        // Calculate cache age
        const cacheAge = (Date.now() - tourData.cachedAt) / (1000 * 60 * 60 * 24);
        const lastCheckAge = (Date.now() - tourData.lastChecked) / (1000 * 60 * 60);
        console.log(`   Cache age: ${cacheAge.toFixed(1)} days`);
        console.log(`   Last check: ${lastCheckAge.toFixed(1)} hours ago`);
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('SUMMARY:');
    console.log(`  Total artists with slug mappings: ${slugKeys.length}`);
    console.log(`  Total artists with cached tours: ${tourKeys.length}`);
    console.log(`  Total cache entries: ${artistKeys.length}`);

  } catch (error) {
    console.error('Error reading cache:', error);
  } finally {
    await client.disconnect();
    console.log('\nDisconnected from Redis');
  }
}

// Run the script
logCachedTours().catch(console.error);