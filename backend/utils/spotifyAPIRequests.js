// File: ./backend/utils/spotifyAPIRequests.js (updated with progress tracking)
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
  logger.info("Searching for Artist", { artistName });
  const queryParams = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: 10
  });
  const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
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
 * Gets Spotify information for a list of songs with progress updates
 * - Looks up each song on Spotify
 * - Formats and combines with original song data
 * - Provides progress updates via callback
 * 
 * @param {Array} songList List of songs to look up
 * @param {Function} progressCallback Optional callback for progress updates
 * @returns {Array} Songs with Spotify data
 * @async
 */
const getSpotifySongInfo = async (songList, progressCallback = null) => {
  logger.info("Compiling Spotify song information");
  try {
    const token = await getAccessToken();

    // Initial progress update - starting song search
    if (progressCallback) {
      progressCallback({
        stage: 'spotify_search',
        message: 'Starting Spotify song lookup...',
        progress: 85
      });
    }

    const totalSongs = songList.length;
    const batchSize = 5; // Process songs in batches for better progress reporting
    const batches = Math.ceil(totalSongs / batchSize);
    const spotifyDataParsed = [];

    // Process songs in batches with progress updates
    for (let i = 0; i < batches; i++) {
      // Calculate start and end indices for current batch
      const start = i * batchSize;
      const end = Math.min(start + batchSize, totalSongs);
      const currentBatch = songList.slice(start, end);

      // Update progress
      if (progressCallback) {
        const progress = 85 + ((i / batches) * 15); // Scale from 85% to 100%
        const songsProcessed = Math.min((i + 1) * batchSize, totalSongs);
        progressCallback({
          stage: 'spotify_search',
          message: `Looking up songs on Spotify (${songsProcessed}/${totalSongs})...`,
          progress
        });
      }

      // Process this batch
      const promises = currentBatch.map((song) => {
        return limitedSearchSong(token, song.artist, song.song);
      });

      const batchResponses = await Promise.all(promises);

      // Process responses
      batchResponses.forEach((data, idx) => {
        const songIndex = start + idx;
        const obj = {
          songName: data.tracks.items[0]?.name,
          artistName: data.tracks.items[0]?.artists[0]?.name,
          image: data.tracks.items[0]?.album?.images?.find((img) => img.height === 64),
          uri: data.tracks.items[0]?.uri,
          id: uuidv4(),
        };
        spotifyDataParsed.push({ ...obj, ...songList[songIndex] });
      });
    }

    // Final progress update
    if (progressCallback) {
      progressCallback({
        stage: 'spotify_search',
        message: 'All songs processed!',
        progress: 100
      });
    }

    logger.info("All songs retrieved from Spotify");
    return spotifyDataParsed;
  } catch (error) {
    logger.error("Error getting Spotify song info", error.message);
    throw error;
  }
}

module.exports = { searchArtist, getSpotifySongInfo, getAccessToken }