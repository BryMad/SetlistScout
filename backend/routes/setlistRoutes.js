// File: ./backend/routes/setlistRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  getTourName,
  getAllTourSongs, getArtistPageByName, getArtistPageByMBID, delay,
  getAllTourSongsByMBID, getMultipleArtistPages, getMultipleArtistPagesByMBID
} = require("../utils/setlistAPIRequests.js");
const { getSongTally, getTour, chooseTour, analyzeTours } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo, getAccessToken, searchArtist } = require("../utils/spotifyAPIRequests.js");
const { fetchMBIdFromSpotifyId } = require("../utils/musicBrainzAPIRequests.js");
const { isArtistNameMatch } = require("../utils/musicBrainzChecks.js");
const { searchDeezerArtists } = require("../utils/deezerApiCalls.js");
const sseManager = require('../utils/sseManager');

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
 * Endpoint: POST /analyze_tours
 * Analyzes recent tours for an artist and returns tour options
 * 
 * @param {Object} req.body.artist Artist information object
 * @returns {Object} Tour analysis with options for user selection
 */
router.post('/analyze_tours', async (req, res) => {
  try {
    const { artist } = req.body;

    // Step 1: Get MusicBrainz information
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Step 2: Fetch multiple pages of setlists (up to 60 shows)
    let artistPages;
    let matched = false;

    if (isArtistNameMatch(artist.name, mbArtistName)) {
      matched = true;
      artistPages = await getMultipleArtistPagesByMBID(mbid, 3);
    } else {
      artistPages = await getMultipleArtistPages(artist, 3);
    }

    // Step 3: Analyze tours from all pages
    const tourAnalysis = analyzeTours(artistPages, artist.name);

    // Step 4: Filter and prepare tour options
    const tourOptions = tourAnalysis.tours
      .filter(tour => !tour.isVIPOrSoundcheck) // Remove VIP/soundcheck tours
      .map(tour => ({
        name: tour.name,
        count: tour.count,
        dateRange: tour.earliestDate && tour.latestDate ? {
          earliest: tour.earliestDate,
          latest: tour.latestDate
        } : null,
        isOrphan: tour.isOrphan,
        isStale: tour.isStale
      }));

    // Step 5: Add "Recent Individual Shows" option if there are orphan shows
    if (tourAnalysis.orphanShows > 0) {
      tourOptions.push({
        name: "Recent Individual Shows",
        count: tourAnalysis.orphanShows,
        dateRange: null,
        isOrphan: true,
        isStale: false,
        isIndividual: true
      });
    }

    res.json({
      artist: {
        name: artist.name,
        matchedName: tourAnalysis.selectedArtist
      },
      tourOptions,
      totalShows: tourAnalysis.totalShows,
      metadata: {
        pagesFetched: artistPages.length,
        matched
      }
    });

  } catch (error) {
    console.error('Error in /analyze_tours route:', error);
    if (error.response && error.response.status === 504) {
      res.status(504).json({ error: "Setlist.fm service is currently unavailable. Please try again later." });
    } else if (error.response) {
      res.status(error.response.status).json({ error: error.response.data.error || "An error occurred while analyzing tours." });
    } else {
      res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
  }
});

/**
 * Process selected tour with real-time updates via SSE
 * 
 * @param {Object} artist - Artist information
 * @param {string} tourName - Selected tour name  
 * @param {boolean} isIndividual - Whether this is "Recent Individual Shows"
 * @param {string} clientId - SSE client ID
 */
async function processSelectedTourWithUpdates(artist, tourName, isIndividual, clientId) {
  try {
    sseManager.sendUpdate(clientId, 'start', `Processing ${tourName}`, 5);

    // Step 1: Fetch MusicBrainz ID
    sseManager.sendUpdate(clientId, 'musicbrainz', 'Getting artist information', 15);
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Step 2: Fetch setlist data
    let allTourInfo = [];
    let matched = false;

    if (isIndividual) {
      sseManager.sendUpdate(clientId, 'setlist_fetch', 'Fetching recent individual shows', 30);
      // For individual shows, fetch recent pages and filter orphan shows
      if (isArtistNameMatch(artist.name, mbArtistName)) {
        matched = true;
        const artistPages = await getMultipleArtistPagesByMBID(mbid, 3);
        allTourInfo = artistPages;
      } else {
        const artistPages = await getMultipleArtistPages(artist, 3);
        allTourInfo = artistPages;
      }
    } else {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Fetching all setlists for "${tourName}"`, 30);
      // For specific tours, fetch all pages for that tour
      await delay(600);
      if (isArtistNameMatch(artist.name, mbArtistName)) {
        matched = true;
        allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
      } else {
        allTourInfo = await getAllTourSongs(artist.name, tourName);
      }
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

    // Step 3: Process songs from setlists
    sseManager.sendUpdate(clientId, 'song_processing', 'Analyzing setlists and counting song frequencies', 70);
    const tourInfoOrdered = getSongTally(allTourInfo);

    // Step 4: Get Spotify data for songs
    // Pass the SSE manager's sendUpdate function to track progress
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
      isIndividual: isIndividual || false
    };

    sseManager.completeProcess(clientId, { tourData, spotifySongsOrdered });

  } catch (error) {
    console.error('Error in processSelectedTourWithUpdates:', error);

    // Handle specific error types
    if (error.response && error.response.status === 504) {
      sseManager.sendError(clientId, "Setlist.fm service is currently unavailable. Please try again later.", 504);
    } else if (error.response) {
      sseManager.sendError(clientId, error.response.data.error || "An error occurred while processing the tour.", error.response.status);
    } else {
      sseManager.sendError(clientId, "Internal Server Error. Please try again later.", 500);
    }
  }
}

/**
 * Endpoint: POST /process_selected_tour_with_updates
 * Processes a selected tour with SSE progress updates
 * 
 * @param {Object} req.body.artist Artist information object
 * @param {string} req.body.tourName Selected tour name
 * @param {boolean} req.body.isIndividual Whether this is "Recent Individual Shows"
 * @param {string} req.body.clientId SSE client ID
 * @returns {Object} HTTP 200 response (actual data sent via SSE)
 */
router.post('/process_selected_tour_with_updates', async (req, res) => {
  try {
    const { artist, tourName, isIndividual, clientId } = req.body;

    // Validate required parameters
    if (!artist || !tourName || !clientId) {
      return res.status(400).json({ 
        error: "Missing required parameters: artist, tourName, and clientId" 
      });
    }

    // Start processing in background
    processSelectedTourWithUpdates(artist, tourName, isIndividual, clientId);

    // Return immediately - client will receive updates via SSE
    res.status(200).json({ message: "Processing started" });

  } catch (error) {
    console.error('Error in /process_selected_tour_with_updates route:', error);
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

/**
 * Endpoint: POST /process_selected_tour
 * Processes a selected tour and returns song data with Spotify information
 * 
 * @param {Object} req.body.artist Artist information object
 * @param {string} req.body.tourName Selected tour name
 * @param {boolean} req.body.isIndividual Whether this is "Recent Individual Shows"
 * @returns {Object} Tour data and song information
 */
router.post('/process_selected_tour', async (req, res) => {
  try {
    const { artist, tourName, isIndividual } = req.body;

    // Step 1: Get MusicBrainz information
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Step 2: Fetch setlist data
    let allTourInfo = [];
    let matched = false;

    if (isIndividual) {
      // For individual shows, fetch recent pages and filter orphan shows
      if (isArtistNameMatch(artist.name, mbArtistName)) {
        matched = true;
        const artistPages = await getMultipleArtistPagesByMBID(mbid, 3);
        allTourInfo = artistPages;
      } else {
        const artistPages = await getMultipleArtistPages(artist, 3);
        allTourInfo = artistPages;
      }
    } else {
      // For specific tours, fetch all pages for that tour
      await delay(600);
      if (isArtistNameMatch(artist.name, mbArtistName)) {
        matched = true;
        allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
      } else {
        allTourInfo = await getAllTourSongs(artist.name, tourName);
      }
    }

    // Handle errors in tour info
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      if (allTourInfo && allTourInfo.statusCode) {
        return res.status(allTourInfo.statusCode).json({ error: allTourInfo.message });
      } else {
        return res.status(400).json({ error: "Server is busy. Please try again." });
      }
    }

    // Step 3: Process songs from setlists
    const tourInfoOrdered = getSongTally(allTourInfo);

    // Step 4: Get Spotify data for songs
    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered);

    // Step 5: Return complete data
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
      isIndividual: isIndividual || false
    };

    res.json({
      tourData,
      spotifySongsOrdered,
      metadata: {
        matched,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in /process_selected_tour route:', error);
    if (error.response && error.response.status === 504) {
      res.status(504).json({ error: "Setlist.fm service is currently unavailable. Please try again later." });
    } else if (error.response) {
      res.status(error.response.status).json({ error: error.response.data.error || "An error occurred while processing the tour." });
    } else {
      res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
  }
});

module.exports = router;