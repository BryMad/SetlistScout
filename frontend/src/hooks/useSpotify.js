// src/hooks/useSpotify.js - CHANGES NEEDED

import { useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import { useSetlist } from './useSetlist';
import { server_url } from "../App";

/**
 * Custom hook for Spotify operations
 * - Modified to use session-based authentication
 * 
 * @returns {Object} Spotify methods and state
 */
export const useSpotify = () => {
  const { isLoggedIn, userId, logout } = useAuth();
  const { tourData, spotifyData, setNotification } = useSetlist();

  /**
   * Creates a Spotify playlist from the current songs
   * - No longer sends tokens in the request
   * 
   * @returns {Promise<void>}
   */
  const handleCreatePlaylist = useCallback(async () => {
    // Ensure we have necessary data and auth
    if (!isLoggedIn || !spotifyData?.length || !tourData?.bandName) {
      setNotification({
        message: "Missing required data to create playlist",
        status: "error"
      });
      return;
    }

    // Filter songs that didn't return spotify data
    const trackIds = spotifyData
      .filter(item => item.artistName !== undefined)
      .map(item => item.uri);

    if (trackIds.length === 0) {
      setNotification({
        message: "No valid tracks to add to playlist",
        status: "warning"
      });
      return;
    }

    try {
      // Create the playlist using session-based authentication
      const response = await axios.post(
        `${server_url}/playlist/create_playlist`,
        {
          track_ids: trackIds,
          band: tourData.bandName,
          tour: tourData.tourName || "Tour"
        },
        {
          withCredentials: true // Important to include cookies for session auth
        }
      );

      setNotification({
        message: "Playlist created successfully!",
        status: "success"
      });
    } catch (error) {
      console.error('Error creating playlist:', error);

      // Handle auth errors by logging out
      if (error.response?.status === 401 || error.response?.data?.authError) {
        logout();
        setNotification({
          message: "Authentication expired. Please log in again.",
          status: "error"
        });
      } else {
        setNotification({
          message: error.response?.data?.error || "Failed to create playlist",
          status: "error"
        });
      }
    }
  }, [isLoggedIn, userId, spotifyData, tourData, setNotification, logout]);

  return {
    isLoggedIn,
    createPlaylist: handleCreatePlaylist
  };
};