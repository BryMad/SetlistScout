// src/hooks/useSpotify.js
import { useState, useCallback } from 'react';
import { createPlaylist } from '../api/playlistService';
import { useAuth } from './useAuth';
import { useSetlist } from './useSetlist';

/**
 * Custom hook for Spotify operations
 * 
 * @returns {Object} Spotify methods and state
 */
export const useSpotify = () => {
  const { isLoggedIn, logout } = useAuth();
  const { tourData, spotifyData, setNotification } = useSetlist();
  const [playlistUrl, setPlaylistUrl] = useState(null);

  /**
   * Creates a Spotify playlist from the current songs
   * 
   * @returns {Promise<void>}
   */
  const handleCreatePlaylist = useCallback(async () => {
    // Reset playlist URL
    setPlaylistUrl(null);

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

    // Create the playlist
    const result = await createPlaylist({
      trackIds,
      bandName: tourData.bandName,
      tourName: tourData.tourName || "Tour"
    });

    if (result.success) {
      // Store the playlist URL if it was returned
      if (result.playlistUrl) {
        setPlaylistUrl(result.playlistUrl);
      }

      setNotification({
        message: result.message,
        status: "success"
      });
    } else {
      // Handle auth errors by logging out
      if (result.authError) {
        logout();
      }

      setNotification({
        message: result.message,
        status: "error"
      });
    }
  }, [isLoggedIn, spotifyData, tourData, setNotification, logout]);

  /**
   * Clears the current playlist URL
   */
  const clearPlaylistUrl = useCallback(() => {
    setPlaylistUrl(null);
  }, []);

  return {
    isLoggedIn,
    createPlaylist: handleCreatePlaylist,
    playlistUrl,
    clearPlaylistUrl
  };
};