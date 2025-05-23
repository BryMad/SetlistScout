const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');

// Rate limiter for MusicBrainz (they prefer 1 request per second)
const musicBrainzLimiter = new Bottleneck({
  minTime: 1000, // 1 second between requests
  maxConcurrent: 1,
});

/**
 * Fetches MusicBrainz ID from Spotify URL
 * - Queries the MusicBrainz API with the Spotify artist URL
 * - Used to improve matching with Setlist.fm
 * 
 * @param {string} artistUrl Spotify artist URL
 * @returns {Object} MusicBrainz data including artist ID
 * @async
 */
const fetchMBIdFromSpotifyId = async (artistUrl) => {
  try {
    // Encode the artist URL to ensure it's safe for inclusion in a URL query parameter.
    const encodedUrl = encodeURIComponent(artistUrl);
    const apiUrl = `https://musicbrainz.org/ws/2/url/?query=url:${encodedUrl}&targettype=artist&fmt=json`;

    // Make the GET request to the MusicBrainz API.
    const response = await axios.get(apiUrl, {
      headers: {
        // A user-agent required by MusicBrainz.
        'User-Agent': 'SetListScout/1.0 (setlistscout@gmail.com)',
      },
    });

    console.log('MusicBrainz data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error querying MusicBrainz API:', error);
    throw error;
  }
};

/**
 * Search for artists on MusicBrainz with improved fuzzy matching
 * - Returns artist information including MBID
 * - Uses multiple search strategies for better results
 * 
 * @param {string} artistName Name of the artist to search for
 * @returns {Array} Array of matching artists with MBIDs
 * @async
 */
const searchArtistMusicBrainz = async (artistName) => {
  return musicBrainzLimiter.schedule(async () => {
    try {
      console.log("Searching for Artist on MusicBrainz", { artistName });

      // Create multiple search strategies for better matching
      const searches = [];
      const encodedQuery = encodeURIComponent(artistName);
      
      // Strategy 1: Wildcard search for partial matches (like "beyon" -> "beyonce")
      if (artistName.length >= 3) {
        searches.push({
          url: `https://musicbrainz.org/ws/2/artist/?query=artist:${encodedQuery}*&fmt=json&limit=8`,
          strategy: 'wildcard'
        });
      }
      
      // Strategy 2: Exact artist name search  
      searches.push({
        url: `https://musicbrainz.org/ws/2/artist/?query=artist:"${encodedQuery}"&fmt=json&limit=5`,
        strategy: 'exact'
      });
      
      // Strategy 3: General fuzzy search (fallback)
      searches.push({
        url: `https://musicbrainz.org/ws/2/artist/?query=${encodedQuery}&fmt=json&limit=5`,
        strategy: 'general'
      });

      let allArtists = [];
      const seenIds = new Set();

      // Execute searches and combine results
      for (const search of searches) {
        try {
          const response = await axios.get(search.url, {
            headers: {
              'User-Agent': 'SetListScout/1.0 (setlistscout@gmail.com)',
            },
          });

          const artists = response.data.artists.map((artist) => ({
            name: artist.name,
            id: artist.id,
            url: `https://musicbrainz.org/artist/${artist.id}`,
            mbid: artist.id,
            disambiguation: artist.disambiguation || '',
            country: artist.country || '',
            type: artist.type || '',
            score: artist.score || 0,
            searchStrategy: search.strategy,
            image: { url: null }
          }));

          // Add unique artists only
          artists.forEach(artist => {
            if (!seenIds.has(artist.id)) {
              seenIds.add(artist.id);
              allArtists.push(artist);
            }
          });

        } catch (searchError) {
          console.log(`Search strategy ${search.strategy} failed:`, searchError.message);
          // Continue with other strategies
        }
      }

      // Sort by score and relevance with improved ranking
      allArtists.sort((a, b) => {
        // First priority: Exact name matches (but only if they have good metadata)
        const aExactMatch = a.name.toLowerCase() === artistName.toLowerCase();
        const bExactMatch = b.name.toLowerCase() === artistName.toLowerCase();
        
        if (aExactMatch && !bExactMatch) {
          // Only prioritize exact matches if they have disambiguation or country
          if (a.disambiguation || a.country) return -1;
        }
        if (bExactMatch && !aExactMatch) {
          if (b.disambiguation || b.country) return 1;
        }
        
        // Second priority: Artists with rich metadata (more established artists)
        const aMetadataScore = (a.disambiguation ? 2 : 0) + (a.country ? 1 : 0) + (a.type && a.type !== 'Person' ? 1 : 0);
        const bMetadataScore = (b.disambiguation ? 2 : 0) + (b.country ? 1 : 0) + (b.type && b.type !== 'Person' ? 1 : 0);
        
        // Strongly prefer artists with metadata when they have similar scores
        if (Math.abs(a.score - b.score) <= 15) {
          if (aMetadataScore !== bMetadataScore) {
            return bMetadataScore - aMetadataScore;
          }
        }
        
        // Third priority: Starts with search term
        const aStartsWith = a.name.toLowerCase().startsWith(artistName.toLowerCase());
        const bStartsWith = b.name.toLowerCase().startsWith(artistName.toLowerCase());
        
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;
        
        // Fourth priority: MusicBrainz relevance score
        return b.score - a.score;
      });

      const finalResults = allArtists.slice(0, 10);

      console.log("MusicBrainz artist search successful", { 
        artistName, 
        strategiesUsed: searches.length,
        totalFound: finalResults.length
      });

      return finalResults;
    } catch (error) {
      console.error("Error searching artist on MusicBrainz", { artistName, error: error.message });
      throw error;
    }
  });
};

/**
 * Fetch artist image from fanart.tv using MusicBrainz ID
 * - Uses the fanart.tv API to get high-quality artist images
 * - Requires a fanart.tv API key
 * 
 * @param {string} mbid MusicBrainz ID of the artist
 * @returns {string|null} URL of the artist image or null if not found
 * @async
 */
const getArtistImageFromFanart = async (mbid) => {
  try {
    const fanartApiKey = process.env.FANART_API_KEY;
    if (!fanartApiKey) {
      // Only log this once per session to avoid spam
      if (!getArtistImageFromFanart.hasLoggedNoKey) {
        console.log("💡 No fanart.tv API key provided - using placeholder images. Get a free key at https://fanart.tv/get-an-api-key/");
        getArtistImageFromFanart.hasLoggedNoKey = true;
      }
      return null;
    }

    const apiUrl = `https://webservice.fanart.tv/v3/music/${mbid}?api_key=${fanartApiKey}`;
    
    const response = await axios.get(apiUrl);
    
    // fanart.tv returns various image types, prioritize artistthumb or hdmusiclogo
    const images = response.data;
    
    if (images.artistthumb && images.artistthumb.length > 0) {
      return images.artistthumb[0].url;
    } else if (images.hdmusiclogo && images.hdmusiclogo.length > 0) {
      return images.hdmusiclogo[0].url;
    } else if (images.musiclogo && images.musiclogo.length > 0) {
      return images.musiclogo[0].url;
    }
    
    return null;
  } catch (error) {
    // Only log actual errors, not 404s (which are normal when fanart.tv doesn't have the artist)
    if (error.response && error.response.status === 404) {
      // This is normal - fanart.tv doesn't have images for every artist
      return null;
    } else {
      console.error("Error fetching artist image from fanart.tv", { mbid, error: error.message });
      return null;
    }
  }
};

/**
 * Get fallback artist image URL
 * - Creates a placeholder image using UI Avatars service
 * 
 * @param {string} artistName Name of the artist
 * @returns {string} URL of the placeholder image
 */
const getFallbackArtistImage = (artistName) => {
  const encodedName = encodeURIComponent(artistName);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=300&background=1a202c&color=ffffff&format=png`;
};


module.exports = { 
  fetchMBIdFromSpotifyId, 
  searchArtistMusicBrainz, 
  getArtistImageFromFanart, 
  getFallbackArtistImage 
};
