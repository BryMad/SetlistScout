// Test script for setlist slug extraction
// Run with: node backend/test-slug-extraction.js

require('dotenv').config();
const { getSetlistSlug } = require('./utils/setlistSlugExtractor');

async function testSlugExtraction() {
  console.log('Testing setlist.fm slug extraction...\n');

  // Test cases with known artists
  const testCases = [
    {
      artist: { name: 'The Beatles' },
      mbid: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d'
    },
    {
      artist: { name: 'Taylor Swift' },
      mbid: null // Test without MBID
    },
    {
      artist: { name: 'Radiohead' },
      mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711'
    }
  ];

  for (const testCase of testCases) {
    console.log(`Testing artist: ${testCase.artist.name}`);
    console.log(`MBID: ${testCase.mbid || 'Not provided'}`);
    
    try {
      const slug = await getSetlistSlug(testCase.artist, testCase.mbid);
      
      if (slug) {
        console.log(`✅ Success! Slug: ${slug}`);
        console.log(`Tour URL would be: https://www.setlist.fm/stats/concert-map/${slug}.html`);
      } else {
        console.log('❌ Failed to get slug');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

// Run the test
testSlugExtraction().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});