import axios from 'axios';
import { extractSetlistID } from '../utils/setlistHelpers';

// Get the server URL from environment variable
const server_url = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

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
 * Fetch tour information for a specific artist
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const fetchArtistTour = async (artist) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/`,
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

    return {
      spotifyData: response.data.spotifySongsOrdered || [],
      tourData: response.data.tourData || {}
    };
  } catch (error) {
    console.error("Error fetching artist tour:", error);

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