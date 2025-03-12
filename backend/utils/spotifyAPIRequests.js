const axios = require("axios");
const Bottleneck = require('bottleneck');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const limiter = new Bottleneck({
  minTime: 200,         // Minimum time (ms) between requests
  maxConcurrent: 5,     // Maximum number of concurrent requests
});

/**
 * Gets Spotify API access token
 * - Uses client credentials flow
 * 
 * @returns {string} Spotify access token
 * @async
 */
const getAccessToken = async () => {
  logger.info("Requesting Spotify access token");
  try {
    const response = await axios.post("https://accounts.spotify.com/api/token", {
      grant_type: "client_credentials", client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET
    }, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    logger.info("Access token received");
    return response.data.access_token;
  } catch (error) {
    logger.error("Error getting access token", error.message);
    throw error;
  }
}

/**
 * Searches for artists on Spotify
 * - Formats results for frontend display
 * 
 * @param {string} token Spotify access token
 * @param {string} artistName Artist name to search
 * @returns {Array} Matching artist objects
 * @async
 */
const searchArtist = async (token, artistName) => {
  // const query = `q:${artistName}`;
  logger.info("Searching for Artist", { artistName });
  const queryParams = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: 10
  });
  const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
  // console.log("ARTIST URL: ======", url)
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    logger.info("Artist search successful", { artistName });

    return response.data.artists.items.map((artist) => ({
      name: artist.name,
      id: artist.id,
      url: artist.external_urls.spotify,
      image: artist.images[2] ? artist.images[2] : artist.images[0],
      // genres: artist.genres,
      // followers: artist.followers.total
    }));
  } catch (error) {
    logger.error("Error searching artist", { artistName, error: error.message });
    throw error;
  }

}

/**
 * Searches for a specific song on Spotify
 * - Handles special cases like "ultraviolet"/"ultra violet"
 * 
 * @param {string} token Spotify access token
 * @param {string} artistName Artist name
 * @param {string} trackName Track name
 * @returns {Object} Search results from Spotify
 * @async
 */
const searchSong = async (token, artistName, trackName) => {
  const query = `track:${trackName} artist:${artistName}`;
  logger.info("Searching for song", { artistName, trackName });
  try {
    const queryParams = new URLSearchParams({
      q: query,
      type: 'track',
    });
    const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
    let response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // If no results, check for specific cases (e.g., "ultraviolet")
    if (!response.data.tracks.items.length) {
      // Check if the track name contains "ultraviolet" (without space)
      if (trackName.toLowerCase().includes("ultraviolet") && !trackName.toLowerCase().includes("ultra violet")) {
        const modifiedTrackName = trackName.replace(/ultraviolet/i, "ultra violet");
        logger.info("No results found. Retrying search with modified track name", {
          original: trackName,
          modified: modifiedTrackName,
        });
        const modifiedQuery = `track:${modifiedTrackName} artist:${artistName}`;
        const modifiedQueryParams = new URLSearchParams({
          q: modifiedQuery,
          type: 'track',
        });
        const modifiedUrl = `https://api.spotify.com/v1/search?${modifiedQueryParams.toString()}`;
        response = await axios.get(modifiedUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }
    logger.info("Song search successful", { artistName, trackName });
    return response.data;
  } catch (error) {
    logger.error("Error searching song", { query, error: error.message });
    throw error;
  }
};

// Rate limit the searchSong function to avoid hitting Spotify API limits
const limitedSearchSong = limiter.wrap(searchSong);

/**
 * Gets Spotify information for a list of songs
 * - Looks up each song on Spotify
 * - Formats and combines with original song data
 * 
 * @param {Array} songList List of songs to look up
 * @returns {Array} Songs with Spotify data
 * @async
 */
const getSpotifySongInfo = async (songList) => {
  logger.info("Compiling Spotify song information");
  try {
    const token = await getAccessToken();
    const promises = songList.map((song) => {
      return limitedSearchSong(token, song.artist, song.song);
    });
    const spotifyResponses = await Promise.all(promises);
    logger.info("All songs retrieved from Spotify");
    const spotifyDataParsed = spotifyResponses.map((data, index) => {
      const obj = {
        songName: data.tracks.items[0]?.name,
        artistName: data.tracks.items[0]?.artists[0]?.name,
        image: data.tracks.items[0]?.album?.images?.find((img) => img.height === 64),
        uri: data.tracks.items[0]?.uri,
        id: uuidv4(),
      };
      return { ...obj, ...songList[index] };
    });
    return spotifyDataParsed;
  } catch (error) {
    logger.error("Error getting Spotify song info", error.message);
    throw error;
  }
}

// Older Basic Functions from learning Spotify API

// const basicQuery = async (token) => {
//   logger.info("Making basic query to Spotify");
//   try {
//     const response = await axios.get("https://api.spotify.com/v1/artists/4Z8W4fKeB5YxbusRsdQVPb", {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//     logger.info("Basic query successful");
//     return response.data;
//   } catch (error) {
//     logger.error("Error in basic query", error.message);
//     throw error;
//   }
// }

// const searchSingleSong = async (token) => {
//   logger.info("Searching for a single song on Spotify");
//   try {
//     const response = await axios.get("https://api.spotify.com/v1/search?q=track%3Awith+or+without+you+artist%3Au2&type=track", {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//     logger.info("Single song search completed");
//     return response.data;
//   }
//   catch (error) {
//     logger.error("Error searching single song", error.message);
//     throw error;
//   }
// }

// const getUserID = async (token) => {
//   logger.info("Getting user ID from Spotify");
//   try {
//     const response = await axios.get("https://api.spotify.com/v1/me", {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//     logger.info("User ID retrieved");
//     return response.data.id;
//   } catch (error) {
//     logger.error("Error getting user ID", error.message);
//     throw error;
//   }
// }

// const createPlaylist = async (token, userId) => {
//   logger.info("Creating new playlist for user", { userId });
//   try {
//     const response = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
//       "name": "New Playlist",
//       "description": "New playlist description",
//       "public": false
//     }, {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//     logger.info("Playlist created successfully");
//     return response.data;
//   } catch (error) {
//     logger.error("Error creating playlist", error.message);
//     throw error;
//   }
// }

module.exports = { searchArtist, getSpotifySongInfo, getAccessToken }
