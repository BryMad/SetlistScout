// src/hooks/useSetlist.js
import { useContext, useEffect } from 'react';
import { SetlistContext } from '../context/SetlistContext';
import { searchArtists, searchArtistsDeezer } from '../api/setlistService';
import { useAuth } from './useAuth';

/**
 * Custom hook for setlist operations
 * 
 * @returns {Object} Setlist state and methods
 */
export const useSetlist = () => {
  const setlistContext = useContext(SetlistContext);
  const { sessionRestored } = useAuth(); // Get sessionRestored flag from auth context

  useEffect(() => {
    // Check for saved state in sessionStorage
    const savedState = sessionStorage.getItem("concertCramState");
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setlistContext.restoreData(parsedState);
        // Clear the saved state after restoring
        sessionStorage.removeItem("concertCramState");
      } catch (error) {
        console.error("Error restoring saved state:", error);
      }
    }
  }, []); // Initial check on component mount

  // Add another effect that triggers when the sessionRestored flag changes
  useEffect(() => {
    if (sessionRestored) {
      console.log("Session restored, checking for saved setlist data");
      const savedState = sessionStorage.getItem("concertCramState");
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          setlistContext.restoreData(parsedState);
          // Clear the saved state after restoring
          sessionStorage.removeItem("concertCramState");
        } catch (error) {
          console.error("Error restoring saved state after login:", error);
        }
      }
    }
  }, [sessionRestored, setlistContext]);

  /**
   * Search for artists by name using Spotify API
   * 
   * @param {string} artistName Artist name to search for
   * @returns {Promise<Array>} Promise resolving to array of artist matches
   */
  const searchForArtists = async (artistName) => {
    try {
      return await searchArtists(artistName);
    } catch (error) {
      setlistContext.setNotification({
        message: `Error searching for artists: ${error.message}`,
        status: "error"
      });
      return [];
    }
  };

  /**
   * Search for artists by name using Deezer API
   * 
   * @param {string} artistName Artist name to search for
   * @returns {Promise<Array>} Promise resolving to array of artist matches
   */
  const searchForArtistsDeezer = async (artistName) => {
    try {
      return await searchArtistsDeezer(artistName);
    } catch (error) {
      setlistContext.setNotification({
        message: `Error searching for artists: ${error.message}`,
        status: "error"
      });
      return [];
    }
  };

  return {
    ...setlistContext,
    searchForArtists,
    searchForArtistsDeezer
  };
};