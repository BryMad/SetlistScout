
import { useState, useCallback } from 'react';
import { createPlaylist } from '../api/playlistService';
import { useSetlist } from './useSetlist';

/**
 * Custom hook for Spotify operations
 * - Modified to work with service account pattern
 * 
 * @returns {Object} Spotify methods and state
 */
export const useSpotify = () => {
  const { tourData, spotifyData, setNotification } = useSetlist();
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  /**
   * Creates a Spotify playlist from the current songs
   * - Uses admin service account automatically
   * 
   * @returns {Promise<void>}
   */
  const handleCreatePlaylist = useCallback(async () => {
    // Ensure we have necessary data
    if (!spotifyData?.length || !tourData?.bandName) {
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

    // Set creating playlist state to true
    setIsCreatingPlaylist(true);

    try {
      // Create the playlist using admin account
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
        setNotification({
          message: result.message,
          status: "error"
        });
      }
    } catch (error) {
      console.error("Error creating playlist:", error);

      setNotification({
        message: "Failed to create playlist. Please try again.",
        status: "error"
      });
    } finally {
      // Always set creating playlist state to false when done
      setIsCreatingPlaylist(false);
    }
  }, [spotifyData, tourData, setNotification]);

  /**
   * Clears the current playlist URL
   */
  const clearPlaylistUrl = useCallback(() => {
    setPlaylistUrl(null);
  }, []);

  return {
    // Always return isLoggedIn as true since we're using admin account
    isLoggedIn: true,
    createPlaylist: handleCreatePlaylist,
    playlistUrl,
    clearPlaylistUrl,
    isCreatingPlaylist
  };
};