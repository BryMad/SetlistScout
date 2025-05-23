// Test Beyoncé search specifically
const axios = require('axios');

const testBeyonceSearch = async () => {
  const testQueries = ['beyon', 'beyonce', 'beyoncé', 'Beyoncé'];
  
  console.log('🔍 Testing Beyoncé search variations...\n');
  
  for (const query of testQueries) {
    console.log(`Searching for: "${query}"`);
    console.log('=' .repeat(40));
    
    try {
      const response = await axios.post('http://localhost:3000/setlist/artist_search_musicbrainz', {
        artistName: query
      });
      
      const results = response.data;
      console.log(`Found ${results.length} results`);
      
      if (results.length > 0) {
        results.slice(0, 5).forEach((artist, index) => {
          console.log(`  ${index + 1}. ${artist.name} (Score: ${artist.score})`);
          if (artist.disambiguation) {
            console.log(`     ${artist.disambiguation}`);
          }
        });
      } else {
        console.log('  No results found');
      }
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    console.log(''); // Empty line
  }
};

testBeyonceSearch();
