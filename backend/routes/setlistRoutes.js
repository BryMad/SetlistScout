// File: ./backend/routes/setlistRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  getTourName,
  getAllTourSongs, getArtistPageByName, getArtistPageByMBID, delay,
  getAllTourSongsByMBID
} = require("../utils/setlistAPIRequests.js");
const { getSongTally, getTour, chooseTour } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo, getAccessToken, searchArtist } = require("../utils/spotifyAPIRequests.js");
const { fetchMBIdFromSpotifyId } = require("../utils/musicBrainzAPIRequests.js");
const { isArtistNameMatch } = require("../utils/musicBrainzChecks.js");
const { searchDeezerArtists } = require("../utils/deezerApiCalls.js");
const sseManager = require('../utils/sseManager');
const { getSetlistSlug } = require('../utils/setlistSlugExtractor');
const devLogger = require('../utils/devLogger');
const { fetchAllToursFromAPI } = require('../utils/tourExtractor');

/**
 * Endpoint: POST /search_with_updates
 * Streamed version of setlist search that sends progress updates
 * 
 * @param {Object} req.body.artist - Artist information object
 * @param {string} req.body.clientId - SSE client ID for sending updates
 * @returns {Object} Tour data and Spotify song information
 */
router.post('/search_with_updates', async (req, res) => {
  const { artist, clientId } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId parameter' });
  }

  try {
    // Start processing and send updates via SSE instead of waiting for completion
    processArtistWithUpdates(artist, clientId);

    // Immediately return success to the client
    return res.status(202).json({
      message: 'Request accepted, processing started',
      clientId
    });
  } catch (error) {
    console.error('Error setting up processing:', error);
    return res.status(500).json({ error: 'Failed to start processing' });
  }
});

/**
 * Process artist data with real-time updates via SSE
 * 
 * @param {Object} artist - Artist information
 * @param {string} clientId - SSE client ID
 */
async function processArtistWithUpdates(artist, clientId) {
  try {
    devLogger.log('sse', `Starting Live Shows search for artist`, {
      artistName: artist.name,
      artistId: artist.id || artist.spotifyId,
      artistUrl: artist.url,
      clientId: clientId
    });
    
    sseManager.sendUpdate(clientId, 'start', `Starting search for ${artist.name}`, 5);

    // Step 1: Fetch MusicBrainz ID
    sseManager.sendUpdate(clientId, 'musicbrainz', 'Contacting MusicBrainz for artist identification', 15);
    devLogger.log('musicbrainz', `Looking up artist on MusicBrainz`, {
      artistName: artist.name,
      artistUrl: artist.url
    });
    
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;
    
    devLogger.log('musicbrainz', `MusicBrainz lookup completed`, {
      mbArtistName: mbArtistName,
      mbid: mbid,
      matched: !!mbid,
      originalName: artist.name
    });

    // Step 2: Get artist page from Setlist.fm
    let artistPage;
    let matched = false;

    if (isArtistNameMatch(artist.name, mbArtistName)) {
      devLogger.log('setlist', `Exact artist match found, using MBID lookup`, {
        artistName: artist.name,
        mbArtistName: mbArtistName,
        mbid: mbid
      });
      sseManager.sendUpdate(clientId, 'setlist_search', `Found exact match for ${artist.name} on MusicBrainz, getting setlist data`, 30);
      matched = true;
      artistPage = await getArtistPageByMBID(mbid);
    } else {
      devLogger.log('setlist', `No exact match, searching by name`, {
        searchName: artist.name,
        mbArtistName: mbArtistName
      });
      sseManager.sendUpdate(clientId, 'setlist_search', `Searching Setlist.fm for ${artist.name}`, 30);
      artistPage = await getArtistPageByName(artist);
    }
    
    devLogger.log('setlist', `Setlist.fm query completed`, {
      hasResults: !!(artistPage?.setlist?.length),
      setlistCount: artistPage?.setlist?.length || 0
    });

    // Step 3: Process tour information
    sseManager.sendUpdate(clientId, 'tour_processing', 'Processing tour information', 45);
    const tourInfo = getTour(artistPage);
    const tourName = chooseTour(tourInfo, artist.name);
    
    devLogger.log('setlist', `Tour information processed`, {
      tourName: tourName,
      availableTours: Object.keys(tourInfo || {}),
      artistName: artist.name
    });

    if (!tourName) {
      devLogger.log('setlist', `No setlist information found for artist`, {
        artistName: artist.name,
        mbid: mbid
      });
      sseManager.sendError(clientId, "This artist doesn't have any setlist information", 404);
      return;
    }

    // Step 4: Get all tour data
    await delay(600);
    let allTourInfo = [];

    if (tourName === "No Tour Info") {
      sseManager.sendUpdate(clientId, 'setlist_fetch', 'No specific tour found, using recent performances', 55);
      allTourInfo.push(artistPage);
    } else if (matched) {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Fetching setlists for "${tourName}" tour`, 55);
      allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
    } else {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Fetching setlists for "${tourName}" tour`, 55);
      allTourInfo = await getAllTourSongs(artist.name, tourName);
    }

    // Handle errors in tour info
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      devLogger.log('setlist', `Invalid tour info received`, {
        allTourInfo: allTourInfo,
        isArray: Array.isArray(allTourInfo)
      });
      if (allTourInfo && allTourInfo.statusCode) {
        sseManager.sendError(clientId, allTourInfo.message, allTourInfo.statusCode);
      } else {
        sseManager.sendError(clientId, "Server is busy. Please try again.", 400);
      }
      return;
    }

    // Step 5: Process songs from setlists
    sseManager.sendUpdate(clientId, 'song_processing', 'Analyzing setlists and counting song frequencies', 70);
    const tourInfoOrdered = getSongTally(allTourInfo);

    // Step 6: Get Spotify data for songs
    // Instead of a single update, pass the SSE manager's sendUpdate function to track progress
    const progressCallback = (progressData) => {
      sseManager.sendUpdate(
        clientId,
        progressData.stage,
        progressData.message,
        progressData.progress
      );
    };
    
    devLogger.log('spotify', `Starting Spotify track lookup`, {
      songCount: tourInfoOrdered.songsOrdered?.length || 0
    });

    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered, progressCallback);
    
    devLogger.log('spotify', `Spotify track lookup completed`, {
      tracksFound: spotifySongsOrdered?.length || 0,
      tracksSearched: tourInfoOrdered.songsOrdered?.length || 0
    });

    // Final step: Return complete data
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };
    
    devLogger.log('sse', `Live Shows search completed successfully`, {
      artistName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
      songsFound: spotifySongsOrdered?.length || 0
    });

    sseManager.completeProcess(clientId, { tourData, spotifySongsOrdered });

    // All processing complete

  } catch (error) {
    console.error('Error in processArtistWithUpdates:', error);

    // Handle specific error types
    if (error.response && error.response.status === 504) {
      // Check if it's a Spotify error based on the URL
      if (error.config && error.config.url && error.config.url.includes('api.spotify.com')) {
        sseManager.sendError(clientId, "Spotify service is temporarily unavailable. The setlist data was processed successfully but some songs couldn't be matched.", 504);
      } else {
        sseManager.sendError(clientId, "Setlist.fm service is currently unavailable. Please try again later.", 504);
      }
    } else if (error.response) {
      sseManager.sendError(clientId, error.response.data.error || "An error occurred while fetching setlists.", error.response.status);
    } else {
      sseManager.sendError(clientId, "Internal Server Error. Please try again later.", 500);
    }
  }
}

/**
 * Endpoint: POST /
 * Main endpoint to fetch setlist and tour information
 * 
 * @param {Object} req.body.artist Artist information object
 * @returns {Object} Tour data and Spotify song information
 */
router.post('/', async (req, res) => {
  const { artist } = req.body;
  try {
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    let artistPage;
    let matched = false;
    if (isArtistNameMatch(artist.name, mbArtistName)) {
      console.log("MBID matches Spotify ID!")
      matched = true;
      artistPage = await getArtistPageByMBID(mbid);
    } else {
      console.log("MBID match failed, searching Setlist by name")
      artistPage = await getArtistPageByName(artist);
    }

    const tourInfo = getTour(artistPage);
    const tourName = chooseTour(tourInfo, artist.name);

    if (!tourName) {
      return res.status(400).json({ error: "This Setlist does not have tour information" });
    }
    console.log("tourInfo: ", tourInfo);

    await delay(600);
    let allTourInfo = [];
    if (tourName === "No Tour Info") {
      allTourInfo.push(artistPage);
    }
    else if (matched) {
      allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
    } else {
      allTourInfo = await getAllTourSongs(artist.name, tourName);
    }

    // If function returned an error, handle it:
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      if (allTourInfo && allTourInfo.statusCode) {
        return res
          .status(allTourInfo.statusCode)
          .json({ error: allTourInfo.message });
      }
      // Otherwise, default to 400.
      return res
        .status(400)
        .json({ error: "Server is busy. Please try again." });
    }

    // Compile an ordered list of songs from the tour info.
    const tourInfoOrdered = getSongTally(allTourInfo);
    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered);
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };

    res.json({ tourData, spotifySongsOrdered });
  } catch (error) {
    console.error('Error in /setlist route:', error);

    // Handle 504 Gateway Timeout specifically.
    if (error.response && error.response.status === 504) {
      return res.status(504).json({
        error: "Setlist.fm service is currently unavailable. Please try again later."
      });
    }
    // Handle other specific error statuses if needed
    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data.error || "An error occurred while fetching setlists." });
    }

    // Fallback for other errors
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

/**
 * Endpoint: POST /artist_search
 * Searches for artists on Spotify
 * 
 * @param {string} req.body.artistName Artist name to search
 * @returns {Array} Matching artist objects from Spotify
 */
router.post('/artist_search', async (req, res) => {
  try {
    const token = await getAccessToken();
    const search_query = req.body.artistName;
    const searchResults = await searchArtist(token, search_query);
    res.json(searchResults);
  } catch (error) {
    console.error('Error in /artist_search route:', error);
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

/**
 * Endpoint: POST /artist_search_deezer
 * Searches for artists on Deezer
 * 
 * @param {string} req.body.artistName Artist name to search
 * @returns {Array} Matching artist objects from Deezer
 */
router.post('/artist_search_deezer', async (req, res) => {
  try {
    const search_query = req.body.artistName;
    devLogger.log('deezer', `Artist search initiated for: "${search_query}"`);
    
    const searchResults = await searchDeezerArtists(search_query);
    
    devLogger.log('deezer', `Found ${searchResults.length} results for "${search_query}"`, {
      results: searchResults.map(artist => ({
        id: artist.id,
        name: artist.name,
        url: artist.url,
        popularity: artist.popularity,
        hasImage: !!artist.image
      }))
    });
    
    res.json(searchResults);
  } catch (error) {
    devLogger.error('deezer', 'Error in artist search', error);
    console.error('Error in /artist_search_deezer route:', error);
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

/**
 * Endpoint: POST /search_tour_with_updates
 * Searches for setlists from a specific tour with real-time updates
 * 
 * @param {Object} req.body.artist - Artist information object
 * @param {string} req.body.tourId - Tour ID from scraped tours
 * @param {string} req.body.tourName - Tour name from scraped tours
 * @param {string} req.body.clientId - SSE client ID for sending updates
 * @returns {Object} Tour data and Spotify song information
 */
router.post('/search_tour_with_updates', async (req, res) => {
  const { artist, tourId, tourName, clientId } = req.body;

  console.log('=== TOUR SEARCH REQUEST ===');
  console.log('Artist:', artist?.name);
  console.log('Tour ID:', tourId);
  console.log('Tour Name:', tourName);
  console.log('Client ID:', clientId);
  console.log('========================');

  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId parameter' });
  }

  if (!tourName) {
    return res.status(400).json({ error: 'Missing tourName parameter' });
  }

  // Allow tourId to be null for new tour system
  if (!tourId) {
    console.log('No tourId provided, using tour name only:', tourName);
  }

  try {
    // Start processing specific tour and send updates via SSE
    processTourWithUpdates(artist, tourId, tourName, clientId);

    // Immediately return success to the client
    return res.status(202).json({
      message: 'Tour search request accepted, processing started',
      clientId,
      tourName
    });
  } catch (error) {
    console.error('Error setting up tour processing:', error);
    return res.status(500).json({ error: 'Failed to start tour processing' });
  }
});

/**
 * Process specific tour data with real-time updates via SSE
 * 
 * @param {Object} artist - Artist information
 * @param {string} tourId - Tour ID from scraped tours
 * @param {string} tourName - Tour name from scraped tours
 * @param {string} clientId - SSE client ID
 */
async function processTourWithUpdates(artist, tourId, tourName, clientId) {
  try {
    sseManager.sendUpdate(clientId, 'start', `Starting search for ${artist.name} - ${tourName}`, 5);

    // Step 1: Fetch MusicBrainz ID (same as regular search)
    sseManager.sendUpdate(clientId, 'musicbrainz', 'Contacting MusicBrainz for artist identification', 15);
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Step 2: Get tour setlists directly (skip tour selection logic)
    let allTourInfo = [];
    let matched = false;

    if (isArtistNameMatch(artist.name, mbArtistName)) {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Found exact match for ${artist.name}, fetching ${tourName} setlists`, 40);
      matched = true;
      allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
    } else {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Fetching setlists for "${tourName}" tour`, 40);
      allTourInfo = await getAllTourSongs(artist.name, tourName);
    }

    // Handle errors in tour info
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      devLogger.log('setlist', `Invalid tour info received`, {
        allTourInfo: allTourInfo,
        isArray: Array.isArray(allTourInfo)
      });
      if (allTourInfo && allTourInfo.statusCode) {
        sseManager.sendError(clientId, allTourInfo.message, allTourInfo.statusCode);
      } else {
        sseManager.sendError(clientId, "Server is busy. Please try again.", 400);
      }
      return;
    }

    // Check if we actually got setlists
    const totalSetlists = allTourInfo.reduce((total, page) => total + (page.setlist?.length || 0), 0);
    if (totalSetlists === 0) {
      sseManager.sendError(clientId, `No setlists found for "${tourName}" tour. This tour may not have recorded setlists.`, 404);
      return;
    }

    // Step 3: Process songs from setlists
    sseManager.sendUpdate(clientId, 'song_processing', 'Analyzing setlists and counting song frequencies', 70);
    const tourInfoOrdered = getSongTally(allTourInfo);

    // Step 4: Get Spotify data for songs
    const progressCallback = (progressData) => {
      sseManager.sendUpdate(
        clientId,
        progressData.stage,
        progressData.message,
        progressData.progress
      );
    };

    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered, progressCallback);

    // Final step: Return complete data
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };

    sseManager.completeProcess(clientId, { tourData, spotifySongsOrdered });

  } catch (error) {
    console.error('Error in processTourWithUpdates:', error);

    // Handle specific error types
    if (error.response && error.response.status === 504) {
      // Check if it's a Spotify error based on the URL
      if (error.config && error.config.url && error.config.url.includes('api.spotify.com')) {
        sseManager.sendError(clientId, "Spotify service is temporarily unavailable. The tour data was processed successfully but some songs couldn't be matched.", 504);
      } else {
        sseManager.sendError(clientId, "Setlist.fm service is currently unavailable. Please try again later.", 504);
      }
    } else if (error.response) {
      sseManager.sendError(clientId, error.response.data.error || "An error occurred while processing tour data.", error.response.status);
    } else {
      sseManager.sendError(clientId, "Internal Server Error. Please try again later.", 500);
    }
  }
}

/**
 * Endpoint: POST /artist/:artistId/tours
 * Fetches all tours for a specific artist using Setlist.fm API with MusicBrainz validation
 * 
 * @param {string} req.params.artistId - Artist name (URL decoded)
 * @param {Object} req.body.artist - Full artist object with name, id, url, etc.
 * @returns {Object} { tours: Array, validatedArtistName: string }
 */
router.post('/artist/:artistId/tours', async (req, res) => {
  try {
    const { artistId } = req.params;
    const artistName = decodeURIComponent(artistId);
    const { artist } = req.body;
    
    // Validate that we have the artist object
    if (!artist || !artist.name || !artist.url) {
      console.error('Invalid artist data received:', { artist });
      return res.status(400).json({ 
        error: 'Invalid artist data. Missing artist object with name and url.',
        received: artist
      });
    }
    
    console.log('Processing tours request for artist:', {
      name: artist.name,
      id: artist.id,
      url: artist.url,
      hasImage: !!artist.image,
      popularity: artist.popularity
    });
    
    // Apply MusicBrainz validation to get the correct artist identity
    let mbid = null;
    let validatedArtistName = artistName;
    
    try {
      console.log('Applying MusicBrainz validation for artist:', artistName, 'with URL:', artist.url);
      
      const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
      
      const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
      mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;
      
      console.log('Extracted MusicBrainz data:', { mbArtistName, mbid });
      
      const nameMatch = isArtistNameMatch(artistName, mbArtistName);
      
      if (mbArtistName && nameMatch) {
        console.log(`MusicBrainz validation successful: "${artistName}" matches "${mbArtistName}"`);
        validatedArtistName = mbArtistName; // Use the canonical MusicBrainz name
      } else {
        console.log(`MusicBrainz validation failed or no match: "${artistName}" vs "${mbArtistName}"`);
      }
    } catch (error) {
      console.error('MusicBrainz validation error:', error.message);
      devLogger.error('musicbrainz', 'Error in MusicBrainz validation during advanced search', error);
      // Continue with original artist name if MusicBrainz fails
    }
    
    console.log('Fetching all tours for:', validatedArtistName, 'with MBID:', mbid);
    
    try {
      // Get Redis client from app locals
      const redisClient = req.app.locals.redisClient;
      
      // Fetch all tours using the new API-based function with Redis caching
      const tours = await fetchAllToursFromAPI(validatedArtistName, mbid, null, redisClient);
      
      console.log(`Found ${tours.length} tours for ${validatedArtistName}`);
      
      if (tours.length === 0) {
        return res.json({ 
          tours: [], 
          message: 'No tours found for this artist',
          validatedArtistName: validatedArtistName
        });
      }
      
      return res.json({ 
        tours: tours,
        validatedArtistName: validatedArtistName,
        totalTours: tours.length
      });
      
    } catch (error) {
      console.error('Error fetching tours from API:', error);
      
      return res.status(500).json({ 
        error: 'Failed to fetch tour data',
        message: 'Unable to retrieve tour information. Please try again later.'
      });
    }
    
  } catch (error) {
    console.error('Error in /artist/:artistId/tours route:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
});

/**
 * Endpoint: POST /artist/:artistId/tours_stream
 * Streams tours for a specific artist via SSE as they are discovered
 * 
 * @param {string} req.params.artistId - Artist name (URL decoded)
 * @param {Object} req.body.artist - Full artist object with name, id, url, etc.
 * @param {string} req.body.clientId - SSE client ID for connection management
 * @returns {EventStream} SSE stream with progressive tour updates
 */
router.post('/artist/:artistId/tours_stream', async (req, res) => {
  const { artistId } = req.params;
  const artistName = decodeURIComponent(artistId);
  const { artist, clientId } = req.body;
  
  if (!clientId) {
    return res.status(400).json({ error: 'Client ID is required for SSE streaming' });
  }
  
  // Validate artist data
  if (!artist || !artist.name || !artist.url) {
    sseManager.sendError(clientId, 'Invalid artist data. Missing artist object with name and url.', 400);
    return res.status(400).json({ error: 'Invalid artist data' });
  }
  
  console.log('Starting SSE tour stream for artist:', {
    name: artist.name,
    id: artist.id,
    clientId: clientId
  });
  
  // Process tours in background
  processTourStreamWithUpdates(clientId, artistName, artist, req);
  
  // Return success immediately
  res.json({ message: 'Tour streaming started', clientId });
});

/**
 * Background function to stream tour discoveries via SSE
 * Emits tours progressively as they are found with song data
 */
async function processTourStreamWithUpdates(clientId, artistName, artist, req) {
  try {
    // Apply MusicBrainz validation
    let mbid = null;
    let validatedArtistName = artistName;
    
    sseManager.sendUpdate(clientId, 'artist_validation', 'Validating artist information...', 5);
    
    try {
      const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
      const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
      mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;
      
      if (mbArtistName && isArtistNameMatch(artistName, mbArtistName)) {
        validatedArtistName = mbArtistName;
        sseManager.sendUpdate(clientId, 'artist_validated', `Artist validated: ${validatedArtistName}`, 10);
      }
    } catch (error) {
      console.error('MusicBrainz validation error:', error.message);
      // Continue with original name
    }
    
    // Import the streaming version of tour fetching
    const { fetchAllToursFromAPIStream } = require('../utils/tourExtractor');
    
    // Get Redis client from app locals
    const redisClient = req.app.locals.redisClient;
    
    // Fetch tours with streaming updates and caching
    await fetchAllToursFromAPIStream(validatedArtistName, mbid, clientId, redisClient);
    
    // Send completion
    sseManager.completeProcess(clientId, { message: 'Tour discovery complete' });
    
  } catch (error) {
    console.error('Error in processTourStreamWithUpdates:', error);
    sseManager.sendError(clientId, 'Failed to fetch tour data. Please try again.', 500);
  }
}

/**
 * Endpoint: POST /artist/:artistId/tours
 * Fetches all tours for an artist (non-streaming version)
 * 
 * @param {string} req.params.artistId - Artist name or ID
 * @param {Object} req.body.artist - Artist information object
 * @returns {Object} Array of tours with name, year, and show count
 */
router.post('/artist/:artistId/tours', async (req, res) => {
  const { artistId } = req.params;
  const artistName = decodeURIComponent(artistId);
  const { artist } = req.body;
  
  if (!artist) {
    return res.status(400).json({ error: 'Missing artist data' });
  }
  
  console.log('Fetching tours for artist (non-SSE):', {
    name: artist.name,
    id: artist.id,
    url: artist.url
  });
  
  try {
    // Fetch MusicBrainz ID for accurate matching
    let mbid = null;
    let validatedArtistName = artist.name;
    
    if (artist.url && artist.url.includes('spotify.com')) {
      try {
        const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
        const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
        mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;
        
        if (isArtistNameMatch(artist.name, mbArtistName)) {
          validatedArtistName = mbArtistName || artist.name;
          console.log(`Using MusicBrainz validated name: ${validatedArtistName} (MBID: ${mbid})`);
        }
      } catch (mbError) {
        console.log('MusicBrainz lookup failed, continuing with artist name only:', mbError.message);
      }
    }
    
    // Get Redis client if available
    const redisClient = req.app.locals.redisClient;
    
    // Fetch tours using the non-streaming version
    const tours = await fetchAllToursFromAPI(validatedArtistName, mbid, null, redisClient);
    
    // Return the tours as JSON
    res.json({
      success: true,
      tours: tours,
      artistName: validatedArtistName,
      mbid: mbid
    });
    
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tour data',
      message: error.message 
    });
  }
});

module.exports = router;