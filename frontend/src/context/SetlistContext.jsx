import { createContext, useState, useCallback } from "react";
import {
  fetchArtistTour,
  fetchSetlistById,
  searchArtists,
  analyzeTours,
  processSelectedTourWithUpdates,
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
    // New tour analysis state
    tourOptions: [],
    selectedArtist: null,
    analysisLoading: false,
  });

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

        setState((prev) => ({
          ...prev,
          spotifyData: result.spotifySongsOrdered,
          tourData: result.tourData,
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
   * Analyze tours for an artist and show tour selection
   *
   * @param {Object} artist Artist object with name, id, and url
   * @returns {Promise<void>}
   */
  const fetchTourOptions = useCallback(async (artist) => {
    setState((prev) => ({
      ...prev,
      analysisLoading: true,
      error: null,
      selectedArtist: artist,
      tourOptions: [],
    }));

    try {
      const result = await analyzeTours(artist);
      console.log("Tour analysis result:", result);

      setState((prev) => ({
        ...prev,
        tourOptions: result.tourOptions,
        selectedArtist: artist,
        analysisLoading: false,
      }));

      return { success: true, data: result };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        analysisLoading: false,
        error: error.message || "Failed to analyze tours",
      }));

      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Process a selected tour and fetch song data
   *
   * @param {Object} tour Selected tour object
   * @returns {Promise<void>}
   */
  const selectTour = useCallback(async (tour) => {
    if (!state.selectedArtist) {
      setState((prev) => ({
        ...prev,
        error: "No artist selected",
      }));
      return { success: false, error: "No artist selected" };
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      progress: {
        stage: "processing",
        message: `Processing ${tour.name}...`,
        percent: 0,
      },
    }));

    try {
      const result = await processSelectedTourWithUpdates(
        state.selectedArtist,
        tour.name,
        tour.isIndividual,
        updateProgress
      );
      console.log("Selected tour result:", result);

      setState((prev) => ({
        ...prev,
        spotifyData: result.spotifyData,
        tourData: result.tourData,
        loading: false,
        progress: {
          stage: "complete",
          message: "Tour data loaded successfully!",
          percent: 100,
        },
      }));

      return { success: true };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to process selected tour",
        progress: {
          stage: "error",
          message: error.message || "Failed to process selected tour",
          percent: null,
        },
      }));

      return { success: false, error: error.message };
    }
  }, [state.selectedArtist]);

  /**
   * Reset to initial state and hide tour selection
   */
  const resetSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      tourOptions: [],
      selectedArtist: null,
      spotifyData: [],
      tourData: {},
      loading: false,
      analysisLoading: false,
      error: null,
      progress: {
        stage: "",
        message: "Getting setlist data...",
        percent: null,
      },
    }));
  }, []);

  // Value provided to consumers
  const contextValue = {
    ...state,
    fetchTourData,
    fetchSetlistData,
    setNotification,
    clearError,
    restoreData,
    searchForArtists: searchArtists,
    updateProgress,
    // New tour selection functions
    fetchTourOptions,
    selectTour,
    resetSearch,
  };

  return (
    <SetlistContext.Provider value={contextValue}>
      {children}
    </SetlistContext.Provider>
  );
};
