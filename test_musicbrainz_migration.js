// Test script to verify MusicBrainz + fanart.tv integration
// Run with: node test_musicbrainz_migration.js

const axios = require('axios');

const testArtistSearch = async () => {
  const testArtists = ['Radiohead', 'The Beatles', 'Obscure Artist Name'];
  
  console.log('🎵 Testing MusicBrainz + fanart.tv Artist Search Migration\n');
  
  for (const artistName of testArtists) {
    console.log(`Searching for: ${artistName}`);
    
    try {
      const response = await axios.post('http://localhost:3000/setlist/artist_search_musicbrainz', {
        artistName
      });
      
      const results = response.data;
      console.log(`✅ Found ${results.length} results`);
      
      if (results.length > 0) {
        const firstResult = results[0];
        console.log(`   Top result: ${firstResult.name}`);
        console.log(`   MBID: ${firstResult.mbid}`);
        console.log(`   Image: ${firstResult.image?.url ? '✅ Has image' : '❌ No image'}`);
        if (firstResult.disambiguation) {
          console.log(`   Info: ${firstResult.disambiguation}`);
        }
        if (firstResult.country) {
          console.log(`   Country: ${firstResult.country}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
};

// Run the test
testArtistSearch();
