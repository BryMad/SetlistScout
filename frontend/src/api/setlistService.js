// File: ./frontend/src/api/setlistService.js (updated)
import axios from 'axios';
import { extractSetlistID } from '../utils/setlistHelpers';
import eventSourceService from './sseService';
import { server_url } from "../App";

/**
 * Search for artists by name
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