import { createContext, useState, useCallback, useRef, useMemo } from "react";
import {
  fetchArtistTour,
  fetchSetlistById,
  searchArtists,
  fetchSpecificTourWithUpdates,
} from "../api/setlistService";

// Create the context
export const SetlistContext = createContext(null);

/**
 * Provider component for setlist data
 * - Manages setlist and tour data state
 * - Provides methods for fetching and updating data
 */
export const SetlistProvider = ({ children }) => {
  const [state, setState] = useState({
    spotifyData: [],
    tourData: {},
    showsList: [], // NEW: List of shows for "pick a show" feature
    selectedShowId: null, // NEW: Currently selected show ID
    loading: false,
    error: null,
    playlistNotification: {
      message: "",
      status: "",
    },
    progress: {
      stage: "",
      message: "Getting setlist data...",
      percent: null,
    },
  });

  // NEW: Ref to store Spotify track mapping for efficient lookups
  const spotifyTrackMap = useRef(new Map());

  /**
   * NEW: Build Spotify track map from spotifyData for efficient lookups
   *
   * @param {Array} spotifyData Array of Spotify track data
   */
  const buildSpotifyTrackMap = useCallback((spotifyData) => {
    const map = new Map();
    if (Array.isArray(spotifyData)) {
      spotifyData.forEach((track) => {
        if (track.song && track.artist) {
          const key = `${track.artist}|${track.song}`;
          map.set(key, track);
        }
      });
    }
    spotifyTrackMap.current = map;
  }, []);

  /**
   * Update progress information
   *
   * @param {Object} progressData Progress data object
   */
  const updateProgress = useCallback((progressData) => {
    setState((prev) => ({
      ...prev,
      progress: {
        stage: progressData.stage || prev.progress.stage,
        message: progressData.message || prev.progress.message,
        percent:
          progressData.progress !== undefined
            ? progressData.progress
            : prev.progress.percent,
      },
    }));
  }, []);

  /**
   * Fetch tour data for an artist
   *
   * @param {Object} artist Artist object with name, id, and url
   * @returns {Promise<void>}
   */
  const fetchTourData = useCallback(
    async (artist) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        progress: {
          stage: "initializing",
          message: "Starting search...",
          percent: 0,
        },
      }));

      try {
        // Pass progress callback to fetchArtistTour
        const result = await fetchArtistTour(artist, updateProgress);
        console.log("Artist tour data:", result);

        // Build Spotify track map for efficient lookups
        buildSpotifyTrackMap(result.spotifySongsOrdered);

        setState((prev) => ({
          ...prev,
          spotifyData: result.spotifySongsOrdered,
          tourData: result.tourData,
          showsList: result.showsList || [], // NEW: Store shows list
          selectedShowId: null, // NEW: Reset selected show
          loading: false,
          progress: {
            stage: "complete",
            message: "Data loaded successfully!",
            percent: 100,
          },
        }));

        return { success: true };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to fetch tour data",
          progress: {
            stage: "error",
            message: error.message || "Failed to fetch tour data",
            percent: null,
          },
        }));

        return { success: false, error: error.message };
      }
    },
    [updateProgress]
  );

  /**
   * Fetches setlist data by ID
   *
   * @param {string} setlistUrl URL of the setlist to fetch
   * @returns {Promise<void>}
   */
  const fetchSetlistData = useCallback(async (setlistUrl) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      progress: {
        stage: "initializing",
        message: "Getting setlist data...",
        percent: null,
      },
    }));

    try {
      const { spotifyData, tourData } = await fetchSetlistById(setlistUrl);
      setState((prev) => ({
        ...prev,
        spotifyData,
        tourData,
        loading: false,
        progress: {
          stage: "complete",
          message: "Data loaded successfully!",
          percent: 100,
        },
      }));

      return { success: true };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to fetch setlist data",
        progress: {
          stage: "error",
          message: error.message || "Failed to fetch setlist data",
          percent: null,
        },
      }));

      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Sets a notification message
   *
   * @param {Object} notification Notification object { message, status }
   * @param {number} timeout Time in ms before auto-clearing (0 for no auto-clear)
   */
  const setNotification = useCallback((notification, timeout = 5000) => {
    setState((prev) => ({
      ...prev,
      playlistNotification: notification,
    }));

    // Auto-clear after timeout if specified
    if (timeout > 0) {
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          playlistNotification: { message: "", status: "" },
        }));
      }, timeout);
    }
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Update state with data from restored session
   *
   * @param {Object} restoredData Data to restore { spotifyData, tourData }
   */
  const restoreData = useCallback((restoredData) => {
    if (restoredData) {
      setState((prev) => ({
        ...prev,
        spotifyData: restoredData.spotifyData || prev.spotifyData,
        tourData: restoredData.tourData || prev.tourData,
      }));
    }
  }, []);

  /**
   * Fetches setlist data for a specific tour
   *
   * @param {Object} artist Artist information object
   * @param {string} tourId Tour ID from scraped tours
   * @param {string} tourName Tour name from scraped tours
   * @returns {Promise<Object>} Promise resolving to search result
   */
  const fetchSpecificTourData = useCallback(
    async (artist, tourId, tourName) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        progress: {
          stage: "initializing",
          message: `Getting setlist data for ${tourName}...`,
          percent: null,
        },
      }));

      try {
        const result = await fetchSpecificTourWithUpdates(
          artist,
          tourId,
          tourName,
          updateProgress
        );

        // Build Spotify track map for efficient lookups
        buildSpotifyTrackMap(result.spotifyData || result.spotifySongsOrdered);

        setState((prev) => ({
          ...prev,
          spotifyData: result.spotifyData || result.spotifySongsOrdered,
          tourData: result.tourData,
          showsList: result.showsList || [], // NEW: Store shows list
          selectedShowId: null, // NEW: Reset selected show
          loading: false,
          progress: {
            stage: "complete",
            message: "Data loaded successfully!",
            percent: 100,
          },
        }));

        return { success: true };
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to fetch tour data",
          progress: {
            stage: "error",
            message: error.message || "Failed to fetch tour data",
            percent: null,
          },
        }));

        return { success: false, error: error.message };
      }
    },
    [updateProgress]
  );

  /**
   * NEW: Set the selected show ID for "pick a show" feature
   *
   * @param {string|null} showId Show ID to select, or null to clear selection
   */
  const setSelectedShow = useCallback((showId) => {
    setState((prev) => ({
      ...prev,
      selectedShowId: showId,
    }));
  }, []);

  /**
   * Reset to initial state and hide tour selection
   */
  const resetSearch = useCallback(() => {
    // Clear the Spotify track map
    spotifyTrackMap.current.clear();

    setState((prev) => ({
      ...prev,
      spotifyData: [],
      tourData: {},
      showsList: [], // NEW: Clear shows list
      selectedShowId: null, // NEW: Clear selected show
      loading: false,
      error: null,
      progress: {
        stage: "",
        message: "Getting setlist data...",
        percent: null,
      },
    }));
  }, []);

  /**
   * NEW: Get Spotify track by song and artist using the track map
   *
   * @param {string} song Song name
   * @param {string} artist Artist name
   * @returns {Object|null} Spotify track data or null if not found
   */
  const getSpotifyTrack = useCallback((song, artist) => {
    const key = `${artist}|${song}`;
    return spotifyTrackMap.current.get(key) || null;
  }, []);

  // Value provided to consumers
  const contextValue = {
    ...state,
    fetchTourData,
    fetchSpecificTourData,
    fetchSetlistData,
    setNotification,
    clearError,
    restoreData,
    resetSearch,
    searchForArtists: searchArtists,
    updateProgress,
    setSelectedShow, // NEW: Function to set selected show
    getSpotifyTrack, // NEW: Function to get Spotify track data
    spotifyTrackMap: spotifyTrackMap.current, // NEW: Expose track map for debugging
  };

  return (
    <SetlistContext.Provider value={contextValue}>
      {children}
    </SetlistContext.Provider>
  );
};
