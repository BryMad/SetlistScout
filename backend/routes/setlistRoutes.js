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
const TourCache = require('../utils/tourCache');
const BackgroundCacheUpdater = require('../utils/backgroundCacheUpdate');
// Tour scraping moved to external service
// const { scrapeTours } = require('../utils/tourScraper');

/**
 * Fetch tours from external scraping service using artist slug
 * @param {string} artistSlug - The setlist.fm artist slug
 * @returns {Promise<Array>} Array of tour objects
 */
async function fetchToursFromService(artistSlug) {
  const scraperUrl = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3001';
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  
  if (!artistSlug) {
    console.error('No artist slug provided to fetchToursFromService');
    return [];
  }
  
  try {
    const response = await axios.get(`${scraperUrl}/api/tours/${encodeURIComponent(artistSlug)}`, {
      timeout: 30000, // 30 second timeout
      headers: {
        'X-API-Key': scraperApiKey
      }
    });
    
    if (response.data && response.data.tours) {
      return response.data.tours;
    }
    
    throw new Error('Invalid response from scraper service');
  } catch (error) {
    console.error('Error fetching tours from service:', error.message);
    
    // Return empty array on failure to allow graceful degradation
    return [];
  }
}

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
    processArtistWithUpdates(artist, clientId, req.app.locals.redisClient);

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
 * @param {Object} redisClient - Redis client for caching
 */
async function processArtistWithUpdates(artist, clientId, redisClient = null) {
  try {
    sseManager.sendUpdate(clientId, 'start', `Starting search for ${artist.name}`, 5);

    // Step 1: Fetch MusicBrainz ID
    sseManager.sendUpdate(clientId, 'musicbrainz', 'Contacting MusicBrainz for artist identification', 15);
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Step 2: Get artist page from Setlist.fm
    let artistPage;
    let matched = false;

    if (isArtistNameMatch(artist.name, mbArtistName)) {
      sseManager.sendUpdate(clientId, 'setlist_search', `Found exact match for ${artist.name} on MusicBrainz, getting setlist data`, 30);
      matched = true;
      artistPage = await getArtistPageByMBID(mbid);
    } else {
      sseManager.sendUpdate(clientId, 'setlist_search', `Searching Setlist.fm for ${artist.name}`, 30);
      artistPage = await getArtistPageByName(artist);
    }

    // Step 3: Process tour information
    sseManager.sendUpdate(clientId, 'tour_processing', 'Processing tour information', 45);
    const tourInfo = getTour(artistPage);
    const tourName = chooseTour(tourInfo, artist.name);

    if (!tourName) {
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

    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered, progressCallback);

    // Final step: Return complete data
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };

    sseManager.completeProcess(clientId, { tourData, spotifySongsOrdered });

    // Background cache update (runs after user gets response)
    // Only cache if we have a valid tour name, artist info, and Redis client
    if (tourName && tourName !== "No Tour Info" && artist.name && redisClient) {
      try {
        // Get artist slug for caching - try to get it via setlist API
        const artistSlug = await getSetlistSlug({ name: artist.name }, mbid);
        
        // Trigger background cache update (non-blocking)
        BackgroundCacheUpdater.triggerUpdate(
          redisClient,
          artist,
          tourName,
          artistSlug,
          mbid
        );
      } catch (error) {
        // Don't let background cache errors affect the main response
        console.error('Background cache trigger failed:', error.message);
      }
    }

  } catch (error) {
    console.error('Error in processArtistWithUpdates:', error);

    // Handle specific error types
    if (error.response && error.response.status === 504) {
      sseManager.sendError(clientId, "Setlist.fm service is currently unavailable. Please try again later.", 504);
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
    const searchResults = await searchDeezerArtists(search_query);
    res.json(searchResults);
  } catch (error) {
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

  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId parameter' });
  }

  if (!tourId || !tourName) {
    return res.status(400).json({ error: 'Missing tourId or tourName parameter' });
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
      sseManager.sendError(clientId, "Setlist.fm service is currently unavailable. Please try again later.", 504);
    } else if (error.response) {
      sseManager.sendError(clientId, error.response.data.error || "An error occurred while fetching tour setlists.", error.response.status);
    } else {
      sseManager.sendError(clientId, "Internal Server Error. Please try again later.", 500);
    }
  }
}

/**
 * Endpoint: POST /artist/:artistId/tours
 * Fetches all tours for a specific artist with intelligent caching and MusicBrainz validation
 * 
 * @param {string} req.params.artistId - Artist name (URL decoded)
 * @param {Object} req.body.artist - Full artist object with name, id, url, etc.
 * @returns {Object} { tours: Array, artistSlug: string }
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
    
    // Also log to file for debugging
    const fs = require('fs');
    const logData = {
      timestamp: new Date().toISOString(),
      artistName,
      artist,
      step: 'tour_request_start'
    };
    fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify(logData) + '\n');
    
    // Initialize TourCache with Redis client
    const tourCache = new TourCache(req.app.locals.redisClient);
    
    // Track artist search for popularity stats
    await tourCache.trackArtistSearch(artistName);
    
    // Apply MusicBrainz validation to get the correct artist identity
    let mbid = null;
    let validatedArtistName = artistName;
    let useExactMatch = false;
    
    try {
      console.log('Applying MusicBrainz validation for artist:', artistName, 'with URL:', artist.url);
      
      // Log this step
      fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
        timestamp: new Date().toISOString(),
        step: 'musicbrainz_start',
        artistName,
        url: artist.url
      }) + '\n');
      
      const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
      
      // Log MusicBrainz response
      fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
        timestamp: new Date().toISOString(),
        step: 'musicbrainz_response',
        mbInfo
      }) + '\n');
      
      const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
      mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;
      
      // Debug the matching
      console.log('Extracted MusicBrainz data:', { mbArtistName, mbid });
      fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
        timestamp: new Date().toISOString(),
        step: 'extracted_mb_data',
        mbArtistName,
        mbid,
        artistName
      }) + '\n');
      
      const nameMatch = isArtistNameMatch(artistName, mbArtistName);
      fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
        timestamp: new Date().toISOString(),
        step: 'name_match_result',
        nameMatch,
        artistName,
        mbArtistName
      }) + '\n');
      
      if (mbArtistName && nameMatch) {
        console.log(`MusicBrainz validation successful: "${artistName}" matches "${mbArtistName}"`);
        validatedArtistName = mbArtistName; // Use the canonical MusicBrainz name
        useExactMatch = true;
        
        fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
          timestamp: new Date().toISOString(),
          step: 'validation_success',
          validatedArtistName,
          useExactMatch
        }) + '\n');
      } else {
        console.log(`MusicBrainz validation failed or no match: "${artistName}" vs "${mbArtistName}"`);
        
        fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
          timestamp: new Date().toISOString(),
          step: 'validation_failed',
          artistName,
          mbArtistName,
          hasMbArtistName: !!mbArtistName,
          nameMatch
        }) + '\n');
      }
    } catch (error) {
      console.error('MusicBrainz validation error:', error.message);
      
      // Log the error
      fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
        timestamp: new Date().toISOString(),
        step: 'musicbrainz_error',
        error: error.message
      }) + '\n');
      
      // Continue with original artist name if MusicBrainz fails
    }
    
    // Get the artist slug using validated information
    fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
      timestamp: new Date().toISOString(),
      step: 'before_slug_lookup',
      validatedArtistName,
      useExactMatch,
      mbid
    }) + '\n');
    
    let artistSlug = await tourCache.getCachedSlug(validatedArtistName, mbid);
    
    fs.appendFileSync('/Users/bryanmadole/SetlistScout/debug.log', JSON.stringify({
      timestamp: new Date().toISOString(),
      step: 'cached_slug_result',
      artistSlug
    }) + '\n');
    
    if (!artistSlug) {
      if (useExactMatch && mbid) {
        // Use MusicBrainz ID for more precise matching
        console.log('Getting slug using MusicBrainz ID:', mbid);
        const artistPage = await getArtistPageByMBID(mbid);
        if (artistPage?.setlist?.length > 0) {
          // Extract slug from the first setlist's artist URL
          const firstArtist = artistPage.setlist[0].artist;
          if (firstArtist?.url) {
            const urlMatch = firstArtist.url.match(/setlists\/(.+)\.html/);
            artistSlug = urlMatch ? urlMatch[1] : null;
          }
        }
      } else {
        // Use name-based search with improved filtering
        artistSlug = await getSetlistSlug({ name: validatedArtistName }, mbid);
      }
      
      if (!artistSlug) {
        console.log('Could not find setlist.fm slug for artist:', validatedArtistName);
        return res.json({ 
          tours: [], 
          artistSlug: null,
          message: 'Artist not found on setlist.fm'
        });
      }
      
      // Cache the slug permanently with MBID when available
      await tourCache.cacheArtistSlug(validatedArtistName, artistSlug, mbid);
    }
    
    // Check if we have cached tours
    const cachedTours = await tourCache.getCachedTours(artistSlug);
    
    // If we have cached tours and don't need to check API yet, return them
    if (cachedTours && !tourCache.shouldCheckAPI(cachedTours)) {
      console.log('Returning cached tours for:', validatedArtistName, `(${cachedTours.tours.length} tours)`);
      return res.json({ 
        tours: cachedTours.tours, 
        artistSlug: artistSlug,
        cached: true,
        lastUpdated: cachedTours.lastUpdated,
        validatedArtistName: validatedArtistName
      });
    }
    
    // If we should check API, get recent tour info to see if we need to update
    if (cachedTours && tourCache.shouldCheckAPI(cachedTours)) {
      try {
        // Get recent tour info from setlist.fm API to check for new tours
        // Use the same validation logic as the main search flow
        let artistPage;
        if (useExactMatch && mbid) {
          artistPage = await getArtistPageByMBID(mbid);
        } else {
          artistPage = await getArtistPageByName({ name: validatedArtistName });
        }
        
        const tourInfo = getTour(artistPage);
        const currentTour = chooseTour(tourInfo, validatedArtistName);
        
        // Check if we need to update tours based on what we found
        const shouldUpdate = await tourCache.shouldUpdateTours(artistSlug, currentTour, cachedTours);
        
        if (!shouldUpdate) {
          // No new tours detected, just update last checked time
          await tourCache.updateLastChecked(artistSlug);
          console.log('No new tours detected for:', validatedArtistName, '- returning cached data');
          return res.json({ 
            tours: cachedTours.tours, 
            artistSlug: artistSlug,
            cached: true,
            lastUpdated: cachedTours.lastUpdated,
            lastChecked: new Date().toISOString(),
            validatedArtistName: validatedArtistName
          });
        }
        
        console.log('New tour detected for:', validatedArtistName, '- updating cache');
      } catch (error) {
        console.error('Error checking for new tours:', error);
        // If API check fails, return cached data if we have it
        if (cachedTours) {
          return res.json({ 
            tours: cachedTours.tours, 
            artistSlug: artistSlug,
            cached: true,
            lastUpdated: cachedTours.lastUpdated,
            note: 'Using cached data due to API error',
            validatedArtistName: validatedArtistName
          });
        }
      }
    }
    
    // We need to fetch fresh tours (either no cache or new tours detected)
    console.log('Fetching fresh tours for:', validatedArtistName);
    
    try {
      console.log('Calling scraper service with slug:', artistSlug);
      const tours = await fetchToursFromService(artistSlug);
      console.log(`Scraper returned ${tours.length} tours for slug: ${artistSlug}`);
      
      if (tours.length === 0) {
        console.log('No tours returned from scraper service');
        
        // If we have cached data, return it instead of empty
        if (cachedTours) {
          console.log('Returning cached data as fallback');
          return res.json({ 
            tours: cachedTours.tours, 
            artistSlug: artistSlug,
            cached: true,
            lastUpdated: cachedTours.lastUpdated,
            note: 'Using cached data - scraper returned no tours',
            validatedArtistName: validatedArtistName
          });
        }
        
        console.log('No cached data available, returning empty');
        return res.json({ 
          tours: [], 
          artistSlug: artistSlug,
          message: 'No tours found for this artist',
          validatedArtistName: validatedArtistName,
          debug: {
            originalName: artistName,
            validatedName: validatedArtistName,
            slug: artistSlug,
            hadCachedData: !!cachedTours
          }
        });
      }
      
      // Cache the fresh tours
      await tourCache.cacheTours(artistSlug, tours);
      
      // Get the processed/filtered tours from cache
      const freshCachedTours = await tourCache.getCachedTours(artistSlug);
      
      console.log(`Cached ${freshCachedTours.tours.length} tours for ${validatedArtistName} (${freshCachedTours.originalCount} total, ${freshCachedTours.originalCount - freshCachedTours.filteredCount} filtered out)`);
      
      return res.json({ 
        tours: freshCachedTours.tours, 
        artistSlug: artistSlug,
        cached: false,
        lastUpdated: freshCachedTours.lastUpdated,
        validatedArtistName: validatedArtistName
      });
      
    } catch (error) {
      console.error('Error fetching tours from service:', error);
      
      // If scraper fails but we have cached data, return it
      if (cachedTours) {
        return res.json({ 
          tours: cachedTours.tours, 
          artistSlug: artistSlug,
          cached: true,
          lastUpdated: cachedTours.lastUpdated,
          note: 'Using cached data due to scraper error',
          validatedArtistName: validatedArtistName
        });
      }
      
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

module.exports = router;