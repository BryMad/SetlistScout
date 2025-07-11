require('dotenv').config();
const { createClient } = require('redis');
const axios = require('axios');
const { getSetlistSlug } = require('../utils/setlistSlugExtractor');
const TourCache = require('../utils/tourCache');

// Popular artists to pre-cache
const POPULAR_ARTISTS = [
  'Taylor Swift',
  'Coldplay',
  'The Beatles',
  'Ed Sheeran',
  'Beyoncé',
  'Drake',
  'Bad Bunny',
  'The Weeknd',
  'Bruno Mars',
  'Metallica',
  'Foo Fighters',
  'Pearl Jam',
  'Radiohead',
  'Arctic Monkeys',
  'The Rolling Stones',
  'Bruce Springsteen',
  'Billy Joel',
  'Elton John',
  'Paul McCartney',
  'Madonna'
];

async function warmCache() {
  // Create Redis client
  const redisClient = await createClient({
    url: process.env.REDIS_URL
  }).connect();
  
  const tourCache = new TourCache(redisClient);
  const scraperUrl = process.env.SCRAPER_SERVICE_URL;
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  
  console.log('Starting cache warming for popular artists...');
  
  for (const artistName of POPULAR_ARTISTS) {
    try {
      console.log(`Processing ${artistName}...`);
      
      // Get slug from cache or API
      let slug = await tourCache.getCachedSlug(artistName);
      
      if (!slug) {
        slug = await getSetlistSlug({ name: artistName });
        if (slug) {
          await tourCache.cacheArtistSlug(artistName, slug);
          console.log(`  - Cached slug: ${slug}`);
        }
      }
      
      if (slug) {
        // Check if we already have tours cached
        const cachedTours = await tourCache.getCachedTours(slug);
        
        if (!cachedTours) {
          // Fetch tours from scraper
          const response = await axios.get(`${scraperUrl}/api/tours/${slug}`, {
            headers: { 'X-API-Key': scraperApiKey },
            timeout: 30000
          });
          
          if (response.data && response.data.tours) {
            await tourCache.cacheTours(slug, response.data.tours);
            console.log(`  - Cached ${response.data.tours.length} tours`);
          }
        } else {
          console.log(`  - Already cached (${cachedTours.tours.length} tours)`);
        }
      }
      
      // Be nice to the APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  - Error processing ${artistName}:`, error.message);
    }
  }
  
  console.log('Cache warming complete!');
  await redisClient.quit();
}

// Run if called directly
if (require.main === module) {
  warmCache().catch(console.error);
}

module.exports = { warmCache, POPULAR_ARTISTS };