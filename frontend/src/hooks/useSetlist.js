// src/hooks/useSetlist.js
import { useContext, useEffect } from 'react';
import { SetlistContext } from '../context/SetlistContext';
import { searchArtists } from '../api/setlistService';
import { useAuth } from './useAuth';

/**
 * Custom hook for setlist operations
 * 
 * @returns {Object} Setlist state and methods
 */
export const useSetlist = () => {
  const setlistContext = useContext(SetlistContext);
  const { restoredState } = useAuth();

  if (!setlistContext) {
    throw new Error('useSetlist must be used within a SetlistProvider');
  }

  // Restore data from auth if available (mobile flow)
  useEffect(() => {
    if (restoredState) {
      setlistContext.restoreData(restoredState);
    }
  }, [restoredState, setlistContext]);

  /**
   * Search for artists by name
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

  return {
    ...setlistContext,
    searchForArtists
  };
};