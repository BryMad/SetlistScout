import axios from 'axios';
import { server_url } from "../App";



/**
 * Creates a Spotify playlist from the provided tracks
 * - Shows progress indicator for large playlists
 * - Handles batching on the server side
 * 
 * @param {Object} params Parameters for playlist creation
 * @param {Array<string>} params.trackIds List of Spotify track URIs
 * @param {string} params.bandName Band name for the playlist title (used if no customName)
 * @param {string} params.tourName Tour name for the playlist title (used if no customName)
 * @param {string} params.customName Optional custom playlist name
 * @returns {Promise<Object>} Promise resolving to playlist creation result
 */
export const createPlaylist = async ({ trackIds, bandName, tourName, customName }) => {
  try {
    // Add timeout for large playlists as they'll take longer to process
    const timeout = trackIds.length > 100 ? 60000 : 30000; // 60 seconds for large playlists

    const requestBody = {
      track_ids: trackIds,
      band: bandName,
      tour: tourName,
    };

    // Add custom name if provided
    if (customName) {
      requestBody.customName = customName;
    }

    const response = await axios.post(
      `${server_url}/playlist/create_playlist`,
      requestBody,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true, // Include cookies for session
        timeout: timeout // Set timeout based on playlist size
      }
    );

    return {
      success: true,
      message: "Playlist created successfully!",
      playlistId: response.data.playlist_id,
      playlistUrl: response.data.playlist_url // This will come from the backend
    };
  } catch (error) {
    console.error("Error creating playlist:", error);

    // Handle authentication errors
    if (error.response?.status === 401) {
      return {
        success: false,
        message: "Authentication expired. Please log in again.",
        authError: true
      };
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: "Request timed out. Your playlist might still be creating. Please check your Spotify account."
      };
    }

    // Handle API limit errors
    if (error.response?.status === 429) {
      return {
        success: false,
        message: "Spotify rate limit reached. Please try again in a few minutes."
      };
    }

    // Handle other errors
    return {
      success: false,
      message: `Error creating playlist: ${error.response?.data?.error || "Please try again"}`
    };
  }
};