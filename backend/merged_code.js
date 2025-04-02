// File: ./middleware/authMiddleware.js
/**
 * Middleware to ensure user is authenticated
 * - Checks for valid session with access_token and user_id
 * - Logs detailed authentication state for debugging
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 * @returns {Function} Next middleware or 401 unauthorized response
 */
const ensureAuthenticated = (req, res, next) => {
  console.log('Request cookies:', req.headers.cookie);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Authentication check:', {
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    hasUserId: !!req.session?.user_id,
    userAgent: req.headers['user-agent']
  });

  if (req.session && req.session.access_token && req.session.user_id) {
    return next();
  } else {
    return res.status(401).json({ error: 'User not authenticated' });
  }
};

module.exports = ensureAuthenticated;

// File: ./server.js
// File: ./backend/server.js (updated with Redis connection handling)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Create Redis client with improved connection handling
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 60000, // 60 seconds
    keepAlive: 30000, // Send keep-alive every 30 seconds
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Too many retries on Redis. Giving up.');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000); // increasing delay, capped at 3s
    }
  }
});

// Set up Redis event listeners for connection management
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  if (err.code === 'ECONNRESET' || err.code === 'CONNECTION_BROKEN') {
    console.log('Connection reset detected - Redis will automatically attempt to reconnect');
  }
});

redisClient.on('reconnecting', () => {
  console.log('Attempting to reconnect to Redis...');
});

redisClient.on('connect', () => {
  console.log('Connected/Reconnected to Redis');
});

// Connect to Redis
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Set trust proxy
app.set('trust proxy', 1);

// Middleware Configuration
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
}));
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://setlistscout.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Handle preflight OPTIONS requests for all routes.
app.options('*', cors());

// Initialize RedisStore
const store = new RedisStore({ client: redisClient });

// Session Middleware
app.use(session({
  store: store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Must be true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Important for cross-site cookies
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
    // No domain setting since frontend and backend are on different domains
  },
}));

// Keep Redis connection alive with periodic pings
const REDIS_PING_INTERVAL = 30000; // 30 seconds
setInterval(async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.ping();
      // Uncomment for debugging:
      // console.log('Redis ping successful');
    }
  } catch (error) {
    console.error('Redis ping failed:', error);
  }
}, REDIS_PING_INTERVAL);

// Route Imports
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const setlistRoutes = require('./routes/setlistRoutes');
const sseRoutes = require('./routes/sseRoutes'); // Add the new SSE routes

app.use('/auth', authRoutes);
app.use('/playlist', playlistRoutes);
app.use('/setlist', setlistRoutes);
app.use('/sse', sseRoutes); // Mount the SSE routes


app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res
) => {
  console.log('Serving the frontend application');
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// app.get('/', (req, res) => {
//   res.send('Welcome to the Spotify Setlist App!');
// });

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// File: ./utils/setlistAPIRequests.js
const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');
const limiter = new Bottleneck({
  minTime: 600, // minimum time (ms) between requests
  maxConcurrent: 1, // maximum concurrent requests
});

/**
 * Introduces a delay between API calls
 * - Used for rate limiting
 * 
 * @param {number} ms Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A helper function that wraps axios.get with retry logic.
 * If a 429 (Too Many Requests) error is encountered, it will wait (with exponential backoff) and retry.
 *
 * @param {string} url - The URL to request.
 * @param {object} config - The axios configuration object.
 * @param {number} retries - Number of retry attempts (default 3).
 * @param {number} backoff - Initial backoff delay in ms (default 1000).
 */
const axiosGetWithRetry = async (url, config, retries = 3, backoff = 1000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      // Check if the error is a 429 (Too Many Requests)
      if (error.response && error.response.status === 429 && attempt < retries) {
        logger.warn(`429 error received, retrying attempt ${attempt + 1} for URL: ${url}`);
        await delay(backoff);
        backoff *= 2; // Exponential backoff
        continue;
      } else {
        throw error;
      }
    }
  }
};

// Raw functions for the artist page requests.
const getArtistPageByNameRaw = async (artist) => {
  logger.info('Requesting setlist artist page', { artist });
  const encodedArtistName = encodeURIComponent(`"${artist.name}"`);
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodedArtistName}&p=1`; const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received setlist at artist page');
  return response.data;
};

const getArtistPageByMBIDRaw = async (mbid) => {
  logger.info('Requesting setlist artist page by MBID:', { mbid });
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1`;
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received setlist at artist page');
  return response.data;
};

/**
 * Gets artist page by name from Setlist.fm
 * - Rate-limited to avoid API restrictions
 * 
 * @param {Object} artist Artist object with name
 * @returns {Object} Artist page data from Setlist.fm
 * @async
 */
const getArtistPageByName = limiter.wrap(getArtistPageByNameRaw);
/**
 * Gets artist page by MusicBrainz ID from Setlist.fm
 * - Rate-limited to avoid API restrictions
 * 
 * @param {string} mbid MusicBrainz ID
 * @returns {Object} Artist page data from Setlist.fm
 * @async
 */
const getArtistPageByMBID = limiter.wrap(getArtistPageByMBIDRaw);

/**
 * Gets tour name from a setlist
 * 
 * @param {string} listID Setlist ID
 * @returns {Object} Band name and tour name
 * @async
 */
const getTourName = async (listID) => {
  logger.info('Requesting tour name', { listID });
  const url = `https://api.setlist.fm/rest/1.0/setlist/${listID}`;
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received tour name data', { listID, bandName: response.data.artist.name });
  return {
    bandName: response.data.artist.name,
    tourName: response.data.tour?.name,
  };
};

/**
 * Gets all songs played during a tour
 * - Fetches all pages of results
 * - Handles rate limiting and retries
 * 
 * @param {string} artistName Artist name
 * @param {string} tourName Tour name
 * @returns {Array} All tour setlist data
 * @async
 */
const getAllTourSongs = async (artistName, tourName) => {
  logger.info('Starting to fetch all tour songs', { artistName, tourName });
  try {
    // Rate-limit the first page request as well.
    const firstResponse = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=1&tourName=${tourName}`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });
    logger.debug('Received first page of setlist data', { artistName, tourName });

    const firstPage = firstResponse.data;
    const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
    const allData = [firstPage];
    await delay(1000);

    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      logger.debug('Scheduling page request', { page: i });
      const request = limiter.schedule(() => {
        const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=${i}&tourName=${tourName}`;
        return axiosGetWithRetry(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
          },
        });
      });
      promises.push(request);
    }

    const additionalResponses = await Promise.all(promises);
    additionalResponses.forEach((resp, index) => {
      logger.debug('Received additional page of setlist data', { page: index + 2 });
      allData.push(resp.data);
    });

    return allData;
  } catch (error) {
    logger.error('Error fetching tour songs', {
      artistName,
      tourName,
      error: error.message,
      statusCode: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
    });
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Internal Server Error',
    };
  }
};

/**
 * Gets all songs played during a tour using MusicBrainz ID
 * - Similar to getAllTourSongs but uses MBID for more precise matching
 * 
 * @param {string} artistName Artist name
 * @param {string} mbid MusicBrainz ID
 * @param {string} tourName Tour name
 * @returns {Array} All tour setlist data
 * @async
 */
const getAllTourSongsByMBID = async (artistName, mbid, tourName) => {
  logger.info('Starting to fetch all tour songs by MBID', { artistName, tourName });
  try {
    const firstResponse = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1&tourName=${tourName}`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });
    logger.debug('Received first page of setlist data', { artistName, tourName });

    const firstPage = firstResponse.data;
    const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
    const allData = [firstPage];
    await delay(1000);

    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      logger.debug('Scheduling page request', { page: i });
      const request = limiter.schedule(() => {
        const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${i}&tourName=${tourName}`;
        return axiosGetWithRetry(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
          },
        });
      });
      promises.push(request);
    }

    const additionalResponses = await Promise.all(promises);
    additionalResponses.forEach((resp, index) => {
      logger.debug('Received additional page of setlist data', { page: index + 2 });
      allData.push(resp.data);
    });

    return allData;
  } catch (error) {
    logger.error('Error fetching tour songs', {
      artistName,
      tourName,
      error: error.message,
      statusCode: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
    });
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Internal Server Error',
    };
  }
};

module.exports = { getArtistPageByMBID, getArtistPageByName, getTourName, getAllTourSongs, getAllTourSongsByMBID, delay };


// File: ./utils/musicBrainzChecks.js

/**
 * Checks if artist names match between Spotify and MusicBrainz
 * - Normalizes strings (lowercase, remove diacritics)
 * - Checks for exact match or partial inclusion
 * 
 * @param {string} spotifyName Artist name from Spotify
 * @param {string} mbName Artist name from MusicBrainz
 * @returns {boolean} True if names match, false otherwise
 */
function isArtistNameMatch(spotifyName, mbName) {
  if (!spotifyName || !mbName) return false;
  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizedSpotify = normalize(spotifyName);
  const normalizedMB = normalize(mbName);

  return (
    normalizedSpotify === normalizedMB ||
    normalizedSpotify.includes(normalizedMB) ||
    normalizedMB.includes(normalizedSpotify)
  );
}


module.exports = { isArtistNameMatch };


// File: ./utils/logger.js
const winston = require('winston');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure the logger
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

logger.info(`Logger initialized in ${NODE_ENV} mode`);

module.exports = logger;

// File: ./utils/musicBrainzAPIRequests.js
const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');

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



module.exports = { fetchMBIdFromSpotifyId };


// File: ./utils/setlistFormatData.js
const { all } = require("axios");
const { getTourName } = require("./setlistAPIRequests");
const { isArtistNameMatch } = require("./musicBrainzChecks");


module.exports = {

  /**
   * Extracts and formats tour information from artist page
   * - Organizes tours by artist and counts occurrences
   * - Tracks years of tour activity
   * 
   * @param {Object} artistPage Artist page data from Setlist.fm
   * @returns {Object} Formatted tour information by artist
   */
  getTour: (artistPage) => {
    // Validate input.
    if (!artistPage || !Array.isArray(artistPage.setlist)) {
      return {};
    }
    // The result is bject mapping artist names to tours.
    const result = {};
    for (const entry of artistPage.setlist) {
      // 1) Extract the artist name.
      const artistName = entry.artist?.name;
      if (!artistName) {
        continue; // Skip if no artist name.
      }
      // 2) Ensure result has a key for this artist.
      if (!result[artistName]) {
        result[artistName] = {};
      }
      // 3) Extract the tour name, defaulting to "No Tour Info" if none exists.
      const tourName = entry.tour?.name || "No Tour Info";
      // 4) Ensure we have an object for this tour under the given artist.
      if (!result[artistName][tourName]) {
        result[artistName][tourName] = {
          tourName,
          count: 0,
          years: new Set(),
        };
      }
      // 5) Increment the count of shows for this (artist, tour).
      result[artistName][tourName].count++;
      // 6) Extract the year from the eventDate if present.
      if (entry.eventDate) {
        // eventDate is usually in dd-mm-yyyy format.
        const parts = entry.eventDate.split("-");
        if (parts.length === 3) {
          const year = parts[2];
          result[artistName][tourName].years.add(year);
        }
      }
    }
    // 7) Convert each 'years' Set to a sorted array.
    for (const [artistName, toursMap] of Object.entries(result)) {
      for (const [tour, dataObj] of Object.entries(toursMap)) {
        dataObj.years = Array.from(dataObj.years).sort();
      }
    }
    return result;
  },

  /**
   * Chooses the best tour name based on various criteria
   * - Prefers actual tour names over "No Tour Info"
   * - Filters out VIP/soundcheck tours
   * - Selects most recent tour if multiple options
   * 
   * @param {Object} tourInfo Tour information from getTour
   * @param {string} targetArtistName Target artist name for matching
   * @returns {string} Selected tour name
   */
  chooseTour: (tourInfo, targetArtistName) => {
    const artistNames = Object.keys(tourInfo);
    let selectedArtist;
    // If only one artist, select that one.
    if (artistNames.length === 1) {
      selectedArtist = artistNames[0];
    } else {
      // If multiple, use isArtistNameMatch to choose the best match.
      selectedArtist = artistNames.find(name => isArtistNameMatch(targetArtistName, name));
      // Fallback if no match is found.
      if (!selectedArtist) {
        selectedArtist = artistNames[0];
      }
    }
    // Get the tours for the selected artist.
    const tours = tourInfo[selectedArtist];
    let tourNames = Object.keys(tours);
    if (tourNames.length === 0) {
      return ""; // No tour found.
    }
    // If multiple tours exist, prefer actual tour names over the placeholder.
    if (tourNames.length > 1) {
      const actualTours = tourNames.filter(name => name.toLowerCase() !== "no tour info");
      if (actualTours.length > 0) {
        tourNames = actualTours;
      }
    }
    // If there's only one tour option, return it.
    if (tourNames.length === 1) {
      return tours[tourNames[0]].tourName;
    }
    // Filter out tours with exclusion keywords like VIP or sound check.
    const exclusionKeywords = ["vip", "v.i.p.", "sound check", "soundcheck"];
    let filteredTours = tourNames.filter(tourName => {
      const lowerTourName = tourName.toLowerCase();
      return !exclusionKeywords.some(keyword => lowerTourName.includes(keyword));
    });
    // If filtering removes all options, revert to all tours.
    if (filteredTours.length === 0) {
      filteredTours = tourNames;
    }
    // Among the remaining tours, select the one with the most recent year.
    let chosenTourName = filteredTours[0];
    let latestYear = 0;
    for (const tourName of filteredTours) {
      const years = tours[tourName].years;
      // Determine the most recent year; if no year data, treat as 0.
      const recentYear = (years && years.length > 0)
        ? Math.max(...years.map(Number))
        : 0;
      if (recentYear > latestYear) {
        latestYear = recentYear;
        chosenTourName = tourName;
      }
    }
    return tours[chosenTourName].tourName;
  },

  /**
   * Processes and tallies songs from setlists
   * - Counts song occurrences across all shows
   * - Handles covers vs. original songs
   * - Calculates play frequencies
   * 
   * @param {Array} allTourInfo All tour setlist data
   * @returns {Object} Processed song data with counts and order
   */
  getSongTally: (allTourInfo) => {
    const counts = new Map();
    // const totalShows = allTourInfo[0].total;
    let totalShowsWithData = 0
    let emptySetlistCount = 0; // Counter for setlists with no data

    // log Artist
    const mainArtist = allTourInfo[0].setlist[0].artist.name;

    allTourInfo.forEach((dataPage) => {
      // dataPage is a group of 20 shows from a specific artist's tour
      // dataPage.setlist is an array, each item is an individual show
      // "for each show...""
      dataPage.setlist.forEach((element) => {
        // "sets" are different sections of a show ("main," "encore," etc.)
        // element.sets.set is an array of every section
        // so "for each section of the show..."
        // sometimes there are sets w/ no data. Log how mean
        if (!element.sets?.set?.length) {
          emptySetlistCount++;
        } else {
          totalShowsWithData++;
        }
        element.sets.set.forEach((setSection) => {
          setSection.song.forEach((song) => {
            // skips "Tape" songs (songs that are played before the show starts)
            if (song.hasOwnProperty("tape") && song.tape === true) {
              return;
            }
            // parse whether song is a cover or not, change artist info accordingly
            let currentArtist;
            if (song.hasOwnProperty("cover")) {
              currentArtist = song.cover.name;
            } else {
              currentArtist = mainArtist;
            }
            // create a key for the song, formatted as "artist|song" to match w/ its count
            const key = `${currentArtist}|${song.name}`;
            // if song alreadys, exists, increment its count
            if (counts.hasOwnProperty(key)) {
              counts[key].count++;
            } else {
              // else, create a new entry for the song
              counts[key] = {
                count: 1,
                song: song.name,
                artist: currentArtist,
              };
            }
          });
        });
      });
    });
    const countsOrdered = Object.values(counts);
    countsOrdered.sort((a, b) => {
      if (a.count < b.count) {
        return 1;
      } else if (a.count > b.count) {
        return -1;
      }
      return 0;
    });

    // Debug
    // console.log("counts_ordered: ", counts_ordered);
    // console.log("totalshows: ", totalShows);
    // console.log("emptySetlistCount: ", emptySetlistCount);
    // console.log("totalShows w data: ", totalShowsWithData);
    return {
      songsOrdered: countsOrdered,
      totalShowsWithData: totalShowsWithData,
    };;

  },


};


// File: ./utils/spotifyAPIRequests.js
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
          imageMed: data.tracks.items[0]?.album?.images?.find((img) => img.height === 300),
          albumName: data.tracks.items[0]?.album?.name,
          albumReleaseDate: data.tracks.items[0]?.album?.release_date,
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

// File: ./utils/sseManager.js
// File: ./backend/utils/sseManager.js
const logger = require('./logger');

/**
 * Simple SSE (Server-Sent Events) Manager
 * Manages client connections and message distribution
 */
class SSEManager {
  constructor() {
    this.clients = new Map();
    this.clientIdCounter = 0;
    logger.info('SSE Manager initialized');
  }

  /**
   * Register a new client connection
   * @param {Object} res - Express response object
   * @returns {string} Client ID
   */
  addClient(res) {
    const clientId = (++this.clientIdCounter).toString();

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to server events', clientId })}\n\n`);

    // Store the response object
    this.clients.set(clientId, res);

    logger.info(`Client connected: ${clientId}`);
    return clientId;
  }

  /**
   * Remove a client connection
   * @param {string} clientId - ID of client to remove
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      logger.info(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Send an update message to a specific client
   * @param {string} clientId - ID of client to send to
   * @param {string} stage - Current processing stage
   * @param {string} message - Status message
   * @param {number} [progress] - Optional progress percentage (0-100)
   * @param {Object} [data] - Optional additional data
   */
  sendUpdate(clientId, stage, message, progress = null, data = null) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to send update to non-existent client: ${clientId}`);
      return;
    }

    const event = {
      type: 'update',
      stage,
      message,
      timestamp: new Date().toISOString()
    };

    if (progress !== null) {
      event.progress = progress;
    }

    if (data !== null) {
      event.data = data;
    }

    const res = this.clients.get(clientId);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    logger.debug(`Update sent to client ${clientId}: ${message}`);
  }

  /**
   * Send a completion message and close the connection
   * @param {string} clientId - ID of client to complete
   * @param {Object} finalData - Final data to send with completion
   */
  completeProcess(clientId, finalData = {}) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to complete process for non-existent client: ${clientId}`);
      return;
    }

    const res = this.clients.get(clientId);
    const event = {
      type: 'complete',
      message: 'Process completed',
      timestamp: new Date().toISOString(),
      data: finalData
    };

    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
    this.removeClient(clientId);
    logger.info(`Process completed for client: ${clientId}`);
  }

  /**
   * Send an error message and close the connection
   * @param {string} clientId - ID of client to send error to
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  sendError(clientId, message, statusCode = 500) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to send error to non-existent client: ${clientId}`);
      return;
    }

    const res = this.clients.get(clientId);
    const event = {
      type: 'error',
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
    this.removeClient(clientId);
    logger.error(`Error sent to client ${clientId}: ${message}`);
  }
}

// Create singleton instance
const sseManager = new SSEManager();
module.exports = sseManager;

// File: ./routes/playlistRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const ensureAuthenticated = require('../middleware/authMiddleware');

/**
 * Endpoint: POST /create_playlist
 * Creates a Spotify playlist with selected tracks
 * - Accepts auth tokens via body or session
 * - Creates playlist with tour-specific name
 * - Adds tracks to the playlist
 * 
 * @param {Object} req.body.access_token Spotify access token
 * @param {Object} req.body.user_id Spotify user ID
 * @param {Array<string>} req.body.track_ids Spotify track URIs
 * @param {string} req.body.band Band name
 * @param {string} req.body.tour Tour name
 * @returns {Object} Success message and playlist ID
 */
router.post('/create_playlist', ensureAuthenticated, async (req, res) => {
  try {
    // Get access token and user ID from session
    const access_token = req.session.access_token;
    const user_id = req.session.user_id;
    const track_ids = req.body.track_ids;
    const band = req.body.band;
    const tour = req.body.tour;

    // Create a new playlist
    const createPlaylistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${user_id}/playlists`,
      {
        name: `${band} - ${tour} songs`,
        description: 'Created by SetlistScout',
        public: true,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const playlist_id = createPlaylistResponse.data.id;
    const playlist_url = createPlaylistResponse.data.external_urls.spotify;

    // Add tracks to the playlist
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
      {
        uris: track_ids,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      message: 'Playlist created successfully',
      playlist_id: playlist_id,
      playlist_url: playlist_url  // Return the playlist URL
    });
  } catch (error) {
    console.error('Error creating playlist:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

module.exports = router;

// File: ./routes/authRoutes.js
const express = require('express');
const router = express.Router();
const qs = require('qs');
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

/**
 * Generates a random string for state parameter
 * Used to prevent CSRF attacks in OAuth flow
 * 
 * @param {number} length Length of the random string
 * @returns {string} Random hexadecimal string
 */
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};



/**
 * Endpoint: GET /login
 * Initiates Spotify OAuth flow
 * - Generates state parameter and stores in session
 * - Redirects to Spotify authorization URL
 */
router.get('/login', (req, res) => {
  const state = generateRandomString(16);
  console.log('login state:', state);
  const scope = 'playlist-modify-public';
  // Store state in session for verification
  req.session.state = state;

  console.log("STRINGIFY:====");
  console.log(querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    show_dialog: true
  }));

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

/**
 * Endpoint: GET /callback
 * Handles Spotify OAuth callback
 * - Verifies state to prevent CSRF
 * - Exchanges authorization code for access token
 * - Fetches user information
 * - Handles different flows for mobile vs desktop
 */
router.get('/callback', async (req, res) => {
  try {
    console.log('Host header:', req.headers.host);
    console.log('Origin header:', req.headers.origin);
    console.log('Referer header:', req.headers.referer);
    const code = req.query.code || null;
    const state = req.query.state || null;
    console.log('code:', code);
    console.log('callback state:', state);
    const storedState = req.session.state || null;
    console.log("storedState: ", storedState);
    console.log("state: ", state);

    if (state === null || state !== storedState) {
      console.log('State mismatch error');
      return res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    }

    // Clear state
    req.session.state = null;
    const data = qs.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    console.log('Requesting token from Spotify');
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers: headers });

    if (tokenResponse.status === 200) {
      const access_token = tokenResponse.data.access_token;
      const refresh_token = tokenResponse.data.refresh_token;

      // Get user information
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const user_id = userResponse.data.id;
      console.log('User ID:', user_id);

      // Store tokens in session (secure server-side storage)
      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;
      req.session.user_id = user_id;

      // Save the session explicitly to ensure it's stored before redirect
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
        }

        const frontEndURL = process.env.NODE_ENV === 'production'
          ? 'https://setlistscout.onrender.com'
          : 'http://localhost:5173';

        // Detect if user is on mobile
        const userAgent = req.headers['user-agent'];
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        if (isMobile) {
          // For mobile, redirect with loginStatus=success in fragment
          // But don't include actual tokens for security
          console.log('Mobile detected, redirecting with success status');
          res.redirect(`${frontEndURL}/#loginStatus=success`);
        } else {
          // For desktop, use the popup message approach
          console.log('Desktop detected, sending message via postMessage');
          res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  // For cross-domain communication, the targetOrigin should ideally be specific
  // We're using '*' since this is just sending auth status, not tokens
  const targetOrigin = '*';
  console.log('Sending authentication success message');
  
  try {
    window.opener.postMessage({
      type: 'authentication',
      isLoggedIn: true
    }, targetOrigin);
    console.log('Authentication message sent');
  } catch (err) {
    console.error('Error sending auth message:', err);
  }
  
  // Close the popup after a short delay
  setTimeout(() => {
    window.close();
  }, 300);
</script>
</body>
</html>`);
        }
      });
    } else {
      res.redirect('/error?error=invalid_token');
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.redirect('/error?error=exception');
  }
});

/**
 * Endpoint: POST /refresh
 * Refreshes an expired access token using the refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }

    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

    if (tokenResponse.status === 200) {
      // Sometimes Spotify doesn't return a new refresh token
      const new_access_token = tokenResponse.data.access_token;
      const new_refresh_token = tokenResponse.data.refresh_token || refresh_token;

      // Update session if it exists
      if (req.session) {
        req.session.access_token = new_access_token;
        req.session.refresh_token = new_refresh_token;
      }

      return res.json({
        access_token: new_access_token,
        refresh_token: new_refresh_token
      });
    } else {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', (req, res) => {
  console.log('Request cookies:', req.headers.cookie);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Authentication check:', {
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    hasUserId: !!req.session?.user_id,
    userAgent: req.headers['user-agent']
  });

  const isLoggedIn = !!(req.session && req.session.access_token && req.session.user_id);

  res.json({
    isLoggedIn,
    userId: isLoggedIn ? req.session.user_id : null
  });
});
router.get('/debug-session', (req, res) => {
  res.json({
    sessionId: req.sessionID,
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    cookies: req.headers.cookie
  });
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to log out' });
      }

      res.clearCookie('connect.sid'); // Clear the session cookie
      return res.json({ success: true });
    });
  } else {
    return res.json({ success: true });
  }
});
module.exports = router;

// File: ./routes/setlistRoutes.js
// File: ./backend/routes/setlistRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTourName,
  getAllTourSongs, getArtistPageByName, getArtistPageByMBID, delay,
  getAllTourSongsByMBID
} = require("../utils/setlistAPIRequests.js");
const { getSongTally, getTour, chooseTour } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo, getAccessToken, searchArtist } = require("../utils/spotifyAPIRequests.js");
const { fetchMBIdFromSpotifyId } = require("../utils/musicBrainzAPIRequests.js");
const { isArtistNameMatch } = require("../utils/musicBrainzChecks.js");
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

module.exports = router;

// File: ./routes/sseRoutes.js
// File: ./backend/routes/sseRoutes.js
const express = require('express');
const sseRouter = express.Router();
const sseManager = require('../utils/sseManager');

/**
 * Endpoint: GET /connect
 * Establishes an SSE connection with the client
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
sseRouter.get('/connect', (req, res) => {
  const clientId = sseManager.addClient(res);

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeClient(clientId);
  });
});

module.exports = sseRouter;


