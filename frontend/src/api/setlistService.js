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
 * DEPRECATED use searchArtists instead
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

/**
 * Fetch tour information for a specific tour with SSE progress updates
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @param {string} tourId Tour ID from scraped tours
 * @param {string} tourName Tour name from scraped tours
 * @param {Function} progressCallback Callback function for progress updates
 * @returns {Promise<Object>} Promise resolving to tour data and Spotify info
 */
export const fetchSpecificTourWithUpdates = async (artist, tourId, tourName, progressCallback) => {
  try {
    // Connect to SSE if not already connected
    await eventSourceService.connect();
    const clientId = eventSourceService.getClientId();

    if (!clientId) {
      throw new Error("Failed to establish SSE connection");
    }

    console.log('Starting tour-specific search with clientId:', clientId, 'for tour:', tourName);

    // Set up a listener for this specific search operation
    const listenerId = `tour-search-${Date.now()}`;

    // Create a promise that will resolve when we get complete data or reject on error
    const resultPromise = new Promise((resolve, reject) => {
      eventSourceService.addListener(listenerId, (event) => {
        console.log('Tour search SSE event:', event);

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

    // Initiate the tour search process
    await axios.post(
      `${server_url}/setlist/search_tour_with_updates`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        },
        tourId,
        tourName,
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

    console.log('Tour search completed successfully:', result);
    return {
      tourData: result.tourData,
      spotifyData: result.spotifySongsOrdered,
      showsList: result.showsList
    };
  } catch (error) {
    console.error("Error fetching specific tour with updates:", error);
    throw error;
  }
};

/**
 * Fetch all past tours with SSE progress updates (page-based)
 *
 * @param {Object} artist Artist object with name, id, url
 * @param {Function} progressCallback Receives { stage, message, progress }
 * @returns {Promise<{tours: Array, validatedArtistName: string, totalTours: number}>}
 */
export const fetchAdvancedToursWithUpdates = async (artist, progressCallback) => {
  // Establish SSE connection (one-at-a-time model)
  await eventSourceService.connect();
  const clientId = eventSourceService.getClientId();
  if (!clientId) {
    throw new Error('Failed to establish SSE connection');
  }

  const listenerId = `advanced-search-${Date.now()}`;

  const resultPromise = new Promise((resolve, reject) => {
    eventSourceService.addListener(listenerId, (event) => {
      if (event.type === 'update' && progressCallback) {
        progressCallback({
          stage: event.stage,
          message: event.message,
          progress: event.progress,
        });
      }

      if (event.type === 'complete') {
        resolve(event.data);
      }

      if (event.type === 'error') {
        reject(new Error(event.message));
      }
    });
  });

  await axios.post(
    `${server_url}/setlist/advanced_with_updates`,
    {
      artist: {
        name: artist.name,
        id: artist.id,
        url: artist.url,
      },
      clientId,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  try {
    const result = await resultPromise;
    return result;
  } finally {
    eventSourceService.removeListener(listenerId);
  }
};

/**
 * Fetch individual show data from setlist.fm for "pick a show" feature
 * 
 * @param {string} showId Setlist.fm show ID
 * @returns {Promise<Object>} Promise resolving to show data with songs
 */
export const fetchIndividualShow = async (showId) => {
  try {
    const response = await axios.get(
      `${server_url}/setlist/show/${showId}`,
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching show ${showId}:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch show data');
  }
};