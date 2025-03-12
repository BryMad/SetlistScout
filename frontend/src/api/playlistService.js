import axios from 'axios';

// Get the server URL from environment variable
const server_url = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

/**
 * Creates a Spotify playlist from the provided tracks
 * 
 * @param {Object} params Parameters for playlist creation
 * @param {Array<string>} params.trackIds List of Spotify track URIs
 * @param {string} params.bandName Band name for the playlist title
 * @param {string} params.tourName Tour name for the playlist title
 * @param {string} params.accessToken Spotify access token
 * @param {string} params.userId Spotify user ID
 * @returns {Promise<Object>} Promise resolving to playlist creation result
 */
export const createPlaylist = async ({ trackIds, bandName, tourName, accessToken, userId }) => {
  try {
    const response = await axios.post(
      `${server_url}/playlist/create_playlist`,
      {
        track_ids: trackIds,
        band: bandName,
        tour: tourName,
        access_token: accessToken,
        user_id: userId
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return {
      success: true,
      message: "Playlist created successfully!",
      playlistId: response.data.playlist_id
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

    // Handle other errors
    return {
      success: false,
      message: `Error creating playlist: ${error.response?.data?.error || "Please try again"}`
    };
  }
};