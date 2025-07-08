// File: ./frontend/src/api/setlistService.js
import axios from 'axios';
import { extractSetlistID } from '../utils/setlistHelpers';
import eventSourceService from './sseService';
import { server_url } from "../App";

/**
 * Search for artists by name using Spotify
 * 
 * @param {string} artistName Artist name to search for
 * @returns {Promise<Array>} Promise resolving to array of artist matches
 */
export const searchArtists = async (artistName) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search`,
      { artistName },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data || [];
  } catch (error) {
    console.error("Error searching for artists:", error);
    throw error;
  }
};

/**
 * Search for artists by name using Deezer
 * 
 * @param {string} artistName Artist name to search for
 * @returns {Promise<Array>} Promise resolving to array of artist matches
 */
export const searchArtistsDeezer = async (artistName) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search_deezer`,
      { artistName },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data || [];
  } catch (error) {
    console.error("Error searching for artists with Deezer:", error);
    throw error;
  }
};

/**
 * Fetch tour information for a specific artist with SSE progress updates
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @param {Function} progressCallback Callback function for progress updates
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const fetchArtistTour = async (artist, progressCallback) => {
  try {
    // Connect to SSE if not already connected
    await eventSourceService.connect();
    const clientId = eventSourceService.getClientId();

    if (!clientId) {
      throw new Error("Failed to establish SSE connection");
    }

    // Set up a listener for this specific search operation
    const listenerId = `search-${Date.now()}`;

    // Create a promise that will resolve when we get complete data or reject on error
    const resultPromise = new Promise((resolve, reject) => {
      eventSourceService.addListener(listenerId, (event) => {
        // Pass progress updates to the callback
        if (event.type === 'update' && progressCallback) {
          progressCallback({
            stage: event.stage,
            message: event.message,
            progress: event.progress
          });
        }

        // Handle completion
        if (event.type === 'complete') {
          resolve(event.data);
        }

        // Handle errors
        if (event.type === 'error') {
          reject(new Error(event.message));
        }
      });
    });

    // Initiate the search process
    await axios.post(
      `${server_url}/setlist/search_with_updates`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        },
        clientId
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    // Wait for the result
    const result = await resultPromise;

    // Clean up the listener
    eventSourceService.removeListener(listenerId);

    return result;
  } catch (error) {
    console.error("Error fetching artist tour:", error);

    // Clean up and transform errors
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred.");
      }
    }

    throw error;
  }
};

/**
 * Analyze tours for an artist and return tour options
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @returns {Promise<Object>} Promise resolving to tour analysis with options
 */
export const analyzeTours = async (artist) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/analyze_tours`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        }
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error analyzing tours:", error);

    // Handle specific error cases
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else if (error.response.status === 504) {
        throw new Error("Setlist.fm service is currently unavailable. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred while analyzing tours.");
      }
    }

    throw error;
  }
};

/**
 * Convert a Deezer artist to a Spotify artist by searching for the artist name
 * 
 * @param {Object} deezerArtist Deezer artist object with name and Deezer URL
 * @returns {Promise<Object>} Promise resolving to Spotify artist object
 */
export const convertDeezerToSpotifyArtist = async (deezerArtist) => {
  try {
    // Search for the artist using Spotify
    const spotifyResults = await searchArtists(deezerArtist.name);
    
    if (!spotifyResults || spotifyResults.length === 0) {
      throw new Error(`No Spotify artist found for "${deezerArtist.name}"`);
    }
    
    // Return the first (best) match from Spotify
    const spotifyArtist = spotifyResults[0];
    
    console.log(`Converted Deezer artist "${deezerArtist.name}" to Spotify:`, {
      deezer: deezerArtist.url,
      spotify: spotifyArtist.url,
      name: spotifyArtist.name
    });
    
    return spotifyArtist;
  } catch (error) {
    console.error("Error converting Deezer artist to Spotify artist:", error);
    throw new Error(`Failed to find Spotify equivalent for "${deezerArtist.name}". ${error.message}`);
  }
};

/**
 * Analyze tours for a specific year using smart pagination
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @param {number} year Year to filter by
 * @returns {Promise<Object>} Promise resolving to tour analysis data
 */
export const analyzeToursForYear = async (artist, year) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/analyze_tours_by_year`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        },
        year: year
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error analyzing tours for year:", error);

    // Handle specific error cases
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error(`No setlists found for ${artist.name} in ${year}. Try a different year or artist.`);
      } else if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else if (error.response.status === 504) {
        throw new Error("Setlist.fm service is currently unavailable. Please try again later.");
      } else {
        throw new Error(error.response.data.error || `An error occurred while analyzing tours for ${year}.`);
      }
    }

    throw error;
  }
};

/**
 * Process a selected tour with SSE progress updates
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @param {string} tourName Selected tour name
 * @param {boolean} isIndividual Whether this is "Recent Individual Shows"
 * @param {Function} progressCallback Callback function for progress updates
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const processSelectedTourWithUpdates = async (artist, tourName, isIndividual = false, progressCallback) => {
  try {
    // Connect to SSE if not already connected
    await eventSourceService.connect();
    const clientId = eventSourceService.getClientId();

    if (!clientId) {
      throw new Error("Failed to establish SSE connection");
    }

    // Set up a listener for this specific processing operation
    const listenerId = `process-tour-${Date.now()}`;

    // Create a promise that will resolve when we get complete data or reject on error
    const resultPromise = new Promise((resolve, reject) => {
      eventSourceService.addListener(listenerId, (event) => {
        // Pass progress updates to the callback
        if (event.type === 'update' && progressCallback) {
          progressCallback({
            stage: event.stage,
            message: event.message,
            progress: event.progress
          });
        }

        // Handle completion
        if (event.type === 'complete') {
          resolve(event.data);
        }

        // Handle errors
        if (event.type === 'error') {
          reject(new Error(event.message));
        }
      });
    });

    // Initiate the processing
    await axios.post(
      `${server_url}/setlist/process_selected_tour_with_updates`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        },
        tourName,
        isIndividual,
        clientId
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    // Wait for the result
    const result = await resultPromise;

    // Clean up the listener
    eventSourceService.removeListener(listenerId);

    return {
      spotifyData: result.spotifySongsOrdered || [],
      tourData: result.tourData || {},
      metadata: { processedAt: new Date().toISOString() }
    };
  } catch (error) {
    console.error("Error processing selected tour with updates:", error);

    // Handle specific error cases
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else if (error.response.status === 504) {
        throw new Error("Setlist.fm service is currently unavailable. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred while processing the tour.");
      }
    }

    throw error;
  }
};

/**
 * Process a selected tour and return song data
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @param {string} tourName Selected tour name
 * @param {boolean} isIndividual Whether this is "Recent Individual Shows"
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const processSelectedTour = async (artist, tourName, isIndividual = false) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/process_selected_tour`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        },
        tourName,
        isIndividual
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return {
      spotifyData: response.data.spotifySongsOrdered || [],
      tourData: response.data.tourData || {},
      metadata: response.data.metadata || {}
    };
  } catch (error) {
    console.error("Error processing selected tour:", error);

    // Handle specific error cases
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else if (error.response.status === 504) {
        throw new Error("Setlist.fm service is currently unavailable. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred while processing the tour.");
      }
    }

    throw error;
  }
};

/**
 * Legacy function to fetch setlists by setlist ID
 * 
 * @param {string} setlistUrl URL of the setlist to fetch
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const fetchSetlistById = async (setlistUrl) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist`,
      { listID: extractSetlistID(setlistUrl) },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return {
      spotifyData: response.data.spotifySongsOrdered || [],
      tourData: response.data.tourData || {}
    };
  } catch (error) {
    console.error("Error fetching setlist by ID:", error);

    // Handle specific error cases
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred.");
      }
    }

    throw error;
  }
};