// Quick test to see the actual response structure
const axios = require('axios');

const testSearch = async () => {
  try {
    console.log('🔍 Testing U2 search...\n');
    
    const response = await axios.post('http://localhost:3000/setlist/artist_search_musicbrainz', {
      artistName: 'U2'
    });
    
    const results = response.data;
    console.log(`Found ${results.length} results for U2:`);
    console.log('=' .repeat(50));
    
    results.slice(0, 3).forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name}`);
      console.log(`   MBID: ${artist.mbid}`);
      console.log(`   Image: ${artist.image?.url || 'No image'}`);
      console.log(`   Country: ${artist.country || 'Unknown'}`);
      console.log(`   Type: ${artist.type || 'Unknown'}`);
      console.log(`   Disambiguation: ${artist.disambiguation || 'None'}`);
      console.log(`   Score: ${artist.score}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testSearch();
