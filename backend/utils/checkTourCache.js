/**
 * Utility script to check tour cache in Redis
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('redis');
const { getCachedTours, getTourCacheTTL } = require('./tourCacheManager');
const axios = require('axios');

/**
 * Lookup artist name from MusicBrainz ID
 */
async function lookupArtistName(mbid) {
  try {
    const response = await axios.get(`https://musicbrainz.org/ws/2/artist/${mbid}?fmt=json`, {
      headers: {
        'User-Agent': 'SetlistScout/1.0 (contact@setlistscout.com)'
      },
      timeout: 5000
    });
    return response.data.name || 'Unknown Artist';
  } catch (error) {
    console.log(`  Warning: Could not lookup artist name for MBID ${mbid}`);
    return 'Unknown Artist (MBID lookup failed)';
  }
}

async function checkCache(artistName, mbid = null) {
  const redisClient = createClient({
    url: process.env.REDIS_URL
  });

  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    if (artistName) {
      // Check specific artist
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
          const days = Math.floor(ttl / (24 * 3600));
          const hours = Math.floor((ttl % (24 * 3600)) / 3600);
          const minutes = Math.floor((ttl % 3600) / 60);

          let expirationText;
          if (days > 0) {
            expirationText = `${days}d ${hours}h ${minutes}m`;
          } else if (hours > 0) {
            expirationText = `${hours}h ${minutes}m`;
          } else {
            expirationText = `${minutes}m`;
          }

          console.log(`\nCache expires in: ${expirationText}`);
        }
      } else {
        console.log(`\nNo cached tours found for "${artistName}"${mbid ? ` (MBID: ${mbid})` : ''}`);
      }
    }

    // List all tour cache keys with detailed info
    console.log('\n--- All cached tour entries ---');
    const keys = await redisClient.keys('tours:*');
    if (keys.length > 0) {
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        const days = Math.floor(ttl / (24 * 3600));
        const hours = Math.floor((ttl % (24 * 3600)) / 3600);
        const minutes = Math.floor((ttl % 3600) / 60);

        let expirationText;
        if (days > 0) {
          expirationText = `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
          expirationText = `${hours}h ${minutes}m`;
        } else {
          expirationText = `${minutes}m`;
        }

        try {
          const cachedData = await redisClient.get(key);
          if (cachedData) {
            const tours = JSON.parse(cachedData);
            const tourCount = Array.isArray(tours) ? tours.length : 0;

            // Try to extract artist name from the cache key or tour data
            let artistHint = 'Unknown';

            // First, try to get artist from the MusicBrainz ID in the key
            const keyParts = key.split(':');
            const mbidOrName = keyParts[keyParts.length - 1];

            // If it looks like an MBID (UUID format), lookup the artist name
            if (mbidOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
              // It's an MBID, lookup the artist name from MusicBrainz
              artistHint = await lookupArtistName(mbidOrName);
            } else {
              // It's probably the artist name (with underscores)
              artistHint = mbidOrName.replace(/_/g, ' ');
            }

            console.log(`${key}`);
            console.log(`  Artist: ${artistHint}`);
            console.log(`  Tours cached: ${tourCount}`);
            console.log(`  Sample tour: ${Array.isArray(tours) && tours.length > 0 ? (tours[0].name || tours[0].displayName || 'Unknown') : 'None'}`);
            console.log(`  Expires in: ${expirationText}`);
            console.log('');
          }
        } catch (error) {
          console.log(`${key} (expires in ${expirationText}) - Error parsing data`);
        }
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
  // No arguments - show all cache entries
  checkCache(null, null).then(() => {
    console.log('Done');
    process.exit(0);
  });
} else {
  const artistName = args[0];
  const mbid = args[1] || null;
  checkCache(artistName, mbid).then(() => {
    console.log('Done');
    process.exit(0);
  });
}