import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchIndividualShow } from "../api/setlistService";
import { createPlaylist as createPlaylistAPI } from "../api/playlistService";
import { processShowTracks } from "../utils/tracksHudHelpers";
import { getFromLocalStorage } from "../utils/storage";

/**
 * Comprehensive hook for all TracksHUD business logic
 * Consolidates show data fetching, playlist creation, tour stats, and UI state
 */
export default function useTracksHud({
  selectedShowId,
  setSelectedShow,
  setNotification,
  showsList,
  spotifyData,
  getSpotifyTrack,
  logout,
  playlistUrl,
  clearPlaylistUrl,
  login,
  tourData,
}) {
  // Tab state for switching between "All Songs" and "Pick a Show"
  const [tabIndex, setTabIndex] = useState(0);

  // Individual show data state
  const [showData, setShowData] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [showError, setShowError] = useState(null);

  // Show playlist creation state (separate from tour playlist)
  const [showPlaylistUrl, setShowPlaylistUrl] = useState(null);
  const [isCreatingShowPlaylist, setIsCreatingShowPlaylist] = useState(false);

  /**
   * Handle show selection from dropdown
   */
  const handleShowSelection = useCallback((showId) => {
    setSelectedShow(showId || null);
  }, [setSelectedShow]);

  /**
   * Get sorted shows list (newest first)
   */
  const sortedShows = useMemo(() => {
    if (!showsList || showsList.length === 0) return [];

    return [...showsList].sort((a, b) => {
      // Convert DD-MM-YYYY to comparable format
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        const [day, month, year] = dateStr.split("-");
        return new Date(year, month - 1, day);
      };

      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);

      return dateB - dateA; // Newest first
    });
  }, [showsList]);

  /**
   * Get the currently selected show for display
   */
  const selectedShow = useMemo(() => {
    if (!selectedShowId || !sortedShows.length) return null;
    return sortedShows.find((show) => show.id === selectedShowId);
  }, [selectedShowId, sortedShows]);

  /**
   * Calculate tour years from showsList dates
   */
  const tourYears = useMemo(() => {
    if (!showsList || showsList.length === 0) return null;

    const years = showsList
      .map((show) => {
        if (!show.date) return null;
        const [day, month, year] = show.date.split("-");
        return parseInt(year, 10);
      })
      .filter((year) => year && !isNaN(year));

    if (years.length === 0) return null;

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    return minYear === maxYear ? minYear.toString() : `${minYear}-${maxYear}`;
  }, [showsList]);

  /**
   * Process show tracks with Spotify data
   */
  const showTracks = useMemo(() => {
    if (!showData?.songs) return [];
    return processShowTracks(showData.songs, getSpotifyTrack);
  }, [showData?.songs, getSpotifyTrack]);

  /**
   * Count tracks that have Spotify data (can be added to playlist)
   */
  const availableForPlaylist = useMemo(() => {
    return showTracks.filter((track) => track.uri && !track.spotifyError).length;
  }, [showTracks]);

  /**
   * Create a playlist specifically for the selected show
   */
  const createShowPlaylist = useCallback(async (showData, showTracks, tourData) => {
    if (!showData || !showTracks.length) return;

    // Filter tracks to only include those with Spotify URIs
    const tracksWithSpotify = showTracks.filter(
      (track) => track.uri && !track.spotifyError
    );

    if (tracksWithSpotify.length === 0) {
      setNotification({
        message: "No valid tracks to add to playlist",
        status: "warning",
      });
      return;
    }

    setIsCreatingShowPlaylist(true);

    try {
      // Extract track URIs for playlist creation
      const trackIds = tracksWithSpotify.map((track) => track.uri);

      // Format date for playlist name: MM/DD/YYYY format
      const formatDateForPlaylist = (dateStr) => {
        if (!dateStr) return "Unknown Date";
        try {
          const [day, month, year] = dateStr.split("-");
          return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
        } catch (error) {
          return dateStr;
        }
      };

      // Generate show-specific playlist name
      const playlistName = `${showData.showInfo?.artist || tourData.bandName
        }: ${formatDateForPlaylist(showData.showInfo?.date)} - ${showData.showInfo?.venue || "Unknown Venue"
        }`;

      // Create the playlist
      const result = await createPlaylistAPI({
        trackIds,
        bandName: showData.showInfo?.artist || tourData.bandName,
        tourName: "Show Playlist",
        customName: playlistName,
      });

      if (result.success) {
        if (result.playlistUrl) {
          setShowPlaylistUrl(result.playlistUrl);
        }

        setNotification({
          message: result.message,
          status: "success",
        });
      } else {
        if (result.authError) {
          logout();
        }

        setNotification({
          message: result.message,
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error creating show playlist:", error);
      setNotification({
        message: "Failed to create show playlist. Please try again.",
        status: "error",
      });
    } finally {
      setIsCreatingShowPlaylist(false);
    }
  }, [setNotification, logout]);

  /**
   * Clear show playlist URL
   */
  const clearShowPlaylistUrl = useCallback(() => {
    setShowPlaylistUrl(null);
  }, []);

  /**
   * Handle login button click with consent check
   */
  const handleLoginClick = useCallback(() => {
    const hasConsented = getFromLocalStorage("setlistScoutConsent");

    if (hasConsented) {
      login({ spotifyData, tourData });
    } else {
      setNotification({
        message: "Please accept the Terms & Privacy Policy to continue",
        status: "info",
      });
    }
  }, [login, spotifyData, tourData, setNotification]);

  // Reset tab to "All Tour Songs" when new data loads
  useEffect(() => {
    if (spotifyData?.length > 0) {
      setTabIndex(0);
    }
  }, [spotifyData]);

  // Reset selected show when switching to tab 2
  useEffect(() => {
    if (tabIndex === 1) {
      setSelectedShow(null);
    }
  }, [tabIndex, setSelectedShow]);

  // Clear show playlist URL when selecting a new show
  useEffect(() => {
    if (selectedShowId) {
      clearShowPlaylistUrl();
    }
  }, [selectedShowId, clearShowPlaylistUrl]);

  // Fetch individual show data when a show is selected
  useEffect(() => {
    if (!selectedShowId) {
      setShowData(null);
      setShowError(null);
      return;
    }

    const fetchShow = async () => {
      setShowLoading(true);
      setShowError(null);

      // Set up a timeout to handle hanging requests (30 seconds for individual show)
      const timeoutId = setTimeout(() => {
        setShowLoading(false);
        setShowError("Request timed out");
        setNotification({
          message:
            "Request timed out while loading show data. Please try selecting the show again.",
          status: "error",
        });
      }, 30000);

      try {
        const data = await fetchIndividualShow(selectedShowId);
        clearTimeout(timeoutId);
        setShowData(data);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error fetching show:", error);

        // Provide user-friendly error messages
        let errorMessage = "Failed to load show data. Please try again.";
        if (
          error.message.includes("ENOTFOUND") ||
          error.message.includes("network")
        ) {
          errorMessage =
            "Network error. Please check your connection and try selecting the show again.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. Please try selecting the show again.";
        } else if (error.message.includes("429")) {
          errorMessage =
            "Too many requests. Please wait a moment and try again.";
        }

        setNotification({
          message: errorMessage,
          status: "error",
        });
        setShowError("Error occurred");
        setShowData(null);
      } finally {
        setShowLoading(false);
      }
    };

    fetchShow();
  }, [selectedShowId, setNotification]);

  // Clear playlist URL when a new search is initiated
  useEffect(() => {
    const handleNewSearch = () => {
      if (playlistUrl) {
        clearPlaylistUrl();
      }
    };

    window.addEventListener("new-search-started", handleNewSearch);

    return () => {
      window.removeEventListener("new-search-started", handleNewSearch);
    };
  }, [clearPlaylistUrl, playlistUrl]);

  return {
    // Tab management
    tabIndex,
    setTabIndex,

    // Show selection
    sortedShows,
    selectedShow,
    handleShowSelection,

    // Tour statistics
    tourYears,

    // Individual show data
    showData,
    showLoading,
    showError,

    // Show tracks
    showTracks,
    availableForPlaylist,

    // Show playlist
    showPlaylistUrl,
    isCreatingShowPlaylist,
    createShowPlaylist,
    clearShowPlaylistUrl,

    // Event handlers
    handleLoginClick,
  };
}
