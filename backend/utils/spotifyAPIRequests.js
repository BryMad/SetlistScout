// File: ./backend/utils/spotifyAPIRequests.js (updated with progress tracking)
const axios = require("axios");
const Bottleneck = require('bottleneck');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const devLogger = require('../utils/devLogger');
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
 * Selects the best track from Spotify search results
 * - Prioritizes original studio albums over live/compilation albums
 * - Respects Spotify's relevance ranking while applying smart filtering
 * 
 * @param {Array} tracks Array of track objects from Spotify
 * @param {string} originalTrackName Original track name from setlist
 * @returns {Object|null} Best matching track or null
 */
const selectBestTrack = (tracks, originalTrackName) => {
  if (!tracks || tracks.length === 0) return null;

  // Only consider top 7 results to respect Spotify's relevance ranking
  const topResults = tracks.slice(0, 7);

  const scoredTracks = topResults.map((track, index) => ({
    track,
    score: calculateTrackScore(track, originalTrackName, index)
  }));

  scoredTracks.sort((a, b) => b.score - a.score);
  return scoredTracks[0].track;
};

/**
 * Calculates a score for track selection priority
 * 
 * @param {Object} track Spotify track object
 * @param {string} originalTrackName Original track name
 * @param {number} spotifyRank Position in Spotify's results (0-based)
 * @returns {number} Track score (higher is better)
 */
const calculateTrackScore = (track, originalTrackName, spotifyRank) => {
  let score = 0;
  const album = track.album;
  const albumName = album.name.toLowerCase();
  const trackName = track.name.toLowerCase();
  const originalLower = originalTrackName.toLowerCase();

  // 1. Spotify's ranking matters - higher ranked results get bonus
  score += (7 - spotifyRank) * 10; // #1 gets +60, #2 gets +50, etc.

  // 2. Prioritize album_type = "album" (original studio albums)
  if (album.album_type === 'album') {
    score += 100;
  } else if (album.album_type === 'single') {
    score += 50;
  } else if (album.album_type === 'compilation') {
    score -= 30;
  }

  // 3. Penalize live albums (but allow songs with "live" in title)
  if (isLiveAlbum(albumName) && !isLiveSongTitle(originalLower)) {
    score -= 50;
  }

  // 4. Penalize greatest hits/compilation albums
  if (isCompilationAlbum(albumName)) {
    score -= 40;
  }

  // 5. Prioritize exact track name matches
  if (trackName === originalLower) {
    score += 30;
  }

  return score;
};

/**
 * Checks if an album name indicates a live recording
 * 
 * @param {string} albumName Album name to check
 * @returns {boolean} True if likely a live album
 */
const isLiveAlbum = (albumName) => {
  const liveIndicators = [
    'live', 'concert', 'tour', 'unplugged', 'acoustic session',
    'live at', 'live from', 'in concert', 'live recordings'
  ];
  return liveIndicators.some(indicator => albumName.includes(indicator));
};

/**
 * Checks if a track name legitimately contains "live" as part of the song title
 * 
 * @param {string} trackName Track name to check
 * @returns {boolean} True if "live" is part of the actual song title
 */
const isLiveSongTitle = (trackName) => {
  const liveSongs = [
    'live forever', 'live and let die', 'live to tell', 'live wire',
    'live it up', 'live your life', 'live like you were dying'
  ];
  return liveSongs.some(song => trackName.includes(song));
};

/**
 * Checks if an album name indicates a compilation/greatest hits album
 * 
 * @param {string} albumName Album name to check
 * @returns {boolean} True if likely a compilation album
 */
const isCompilationAlbum = (albumName) => {
  const compilationIndicators = [
    'greatest hits', 'best of', 'collection', 'anthology', 'essentials',
    'complete', 'ultimate', 'definitive', 'selected', 'hits'
  ];
  return compilationIndicators.some(indicator => albumName.includes(indicator));
};

/**
 * Searches for a specific song on Spotify
 * - Handles special cases like "ultraviolet"/"ultra violet"
 * - Uses smart track selection to prioritize original album versions
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

    // Apply smart track selection if we have results
    if (response.data.tracks.items.length > 0) {
      const bestTrack = selectBestTrack(response.data.tracks.items, trackName);
      if (bestTrack) {
        logger.info("Song search successful with smart filtering", {
          artistName,
          trackName,
          selectedAlbum: bestTrack.album.name,
          albumType: bestTrack.album.album_type
        });
        // Return the best track as the first (and only) result
        response.data.tracks.items = [bestTrack];
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

  devLogger.log('spotify', `Starting Spotify song lookup batch`, {
    totalSongs: songList.length,
    firstFewSongs: songList.slice(0, 5).map(song => ({
      song: song.song,
      artist: song.artist,
      count: song.count
    }))
  });

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
          message: `Looking up tracks (${songsProcessed}/${totalSongs})...`,
          progress
        });
      }

      // Process this batch
      const promises = currentBatch.map((song) => {
        return limitedSearchSong(token, song.artist, song.song);
      });

      // Use allSettled to handle individual failures gracefully
      const batchResponses = await Promise.allSettled(promises);

      // Process responses
      batchResponses.forEach((result, idx) => {
        const songIndex = start + idx;
        if (result.status === 'fulfilled') {
          const data = result.value;
          const obj = {
            songName: data.tracks.items[0]?.name,
            artistName: data.tracks.items[0]?.artists[0]?.name,
            image: data.tracks.items[0]?.album?.images?.find((img) => img.height === 64),
            imageMed: data.tracks.items[0]?.album?.images?.find((img) => img.height === 300),
            albumName: data.tracks.items[0]?.album?.name,
            albumReleaseDate: data.tracks.items[0]?.album?.release_date,
            uri: data.tracks.items[0]?.uri,
            id: uuidv4(),
          };
          spotifyDataParsed.push({ ...obj, ...songList[songIndex] });
        } else {
          // Include failed songs without Spotify data
          logger.warn(`Failed to fetch Spotify data for: ${songList[songIndex].song} by ${songList[songIndex].artist}`, result.reason?.message);
          spotifyDataParsed.push({
            ...songList[songIndex],
            id: uuidv4(),
            spotifyError: true,
            errorMessage: result.reason?.message || 'Unknown error'
          });
        }
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

    const foundCount = spotifyDataParsed.filter(song => song.songName).length;
    const missingCount = spotifyDataParsed.length - foundCount;

    devLogger.log('spotify', `Spotify song lookup batch completed`, {
      totalSongs: songList.length,
      foundOnSpotify: foundCount,
      notFoundOnSpotify: missingCount,
      successRate: `${Math.round((foundCount / songList.length) * 100)}%`,
      missingSongs: spotifyDataParsed.filter(song => !song.songName).slice(0, 5).map(song => ({
        song: song.song,
        artist: song.artist
      }))
    });

    logger.info("All songs retrieved from Spotify");
    return spotifyDataParsed;
  } catch (error) {
    devLogger.error('spotify', 'Error getting Spotify song info', error);
    logger.error("Error getting Spotify song info", error.message);
    throw error;
  }
}

module.exports = { searchArtist, getSpotifySongInfo, getAccessToken }