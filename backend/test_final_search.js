// Final test for the optimized search
const axios = require('axios');

const testFinalSearch = async () => {
  const queries = ['beyo', 'beyon', 'radiohe', 'beatl'];
  
  console.log('🎵 Testing improved search with partial queries...\n');
  
  for (const query of queries) {
    console.log(`Typing "${query}" should find:`);
    console.log('=' .repeat(45));
    
    try {
      const response = await axios.post('http://localhost:3000/setlist/artist_search_musicbrainz', {
        artistName: query
      });
      
      const results = response.data;
      console.log(`Found ${results.length} results:`);
      
      results.slice(0, 5).forEach((artist, index) => {
        const info = [];
        if (artist.disambiguation) info.push(artist.disambiguation);
        if (artist.country) info.push(artist.country);
        
        console.log(`  ${index + 1}. ${artist.name} (${artist.score})`);
        if (info.length > 0) {
          console.log(`     ${info.join(' • ')}`);
        }
      });
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    console.log('');
  }
};

testFinalSearch();
