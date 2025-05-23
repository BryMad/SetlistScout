// Test direct MusicBrainz API calls to understand the search behavior
const axios = require('axios');

const testDirectMusicBrainz = async () => {
  console.log('🔍 Testing MusicBrainz API directly...\n');
  
  const testQueries = [
    'artist:beyon*',
    'artist:"beyon*"',
    'beyon*',
    'artist:beyonce',
    'artist:"beyonce"',
    'beyonce',
    'beyon AND beyonce'
  ];
  
  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    console.log('-'.repeat(40));
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://musicbrainz.org/ws/2/artist/?query=${encodedQuery}&fmt=json&limit=5`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'SetListScout/1.0 (setlistscout@gmail.com)',
        },
      });
      
      console.log(`Found ${response.data.artists.length} results:`);
      response.data.artists.forEach((artist, index) => {
        console.log(`  ${index + 1}. ${artist.name} (Score: ${artist.score})`);
      });
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    console.log('');
    
    // Rate limit compliance
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
};

testDirectMusicBrainz();
