// File: ./frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})


// File: ./frontend/src/context/SetlistContext.jsx
import { createContext, useState, useCallback } from "react";
import {
  fetchArtistTour,
  fetchSetlistById,
  searchArtists,
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
  };

  return (
    <SetlistContext.Provider value={contextValue}>
      {children}
    </SetlistContext.Provider>
  );
};


// File: ./frontend/src/context/AuthContext.jsx
// File: ./frontend/src/context/AuthContext.jsx
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import {
  initiateSpotifyLogin,
  checkSessionStatus,
  setupAuthListener,
} from "../api/authService";
import { server_url } from "../App";
import { getFromLocalStorage } from "../utils/storage";

export const AuthContext = createContext(null);

/**
 * Provider component for authentication state
 * - Manages auth state across the application
 * - Handles auth flow initialization and callbacks
 * - Enforces consent before login
 */
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    userId: null,
    isInitialized: false,
  });

  // Add state for sessionRestored flag
  const [sessionRestored, setSessionRestored] = useState(false);

  // Initialize auth on first load
  useEffect(() => {
    const initializeAuth = async () => {
      // Check server-side session status
      const { isLoggedIn, userId } = await checkSessionStatus();

      // Check for URL fragment auth (mobile flow)
      const hasLoginSuccess = window.location.hash.includes(
        "loginStatus=success"
      );

      if (hasLoginSuccess) {
        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Recheck session status after redirect to ensure we have the latest status
        const updatedStatus = await checkSessionStatus();

        setAuthState({
          isLoggedIn: updatedStatus.isLoggedIn,
          userId: updatedStatus.userId,
          isInitialized: true,
        });

        // Set session restored flag to trigger state restoration
        setSessionRestored(true);
      } else {
        setAuthState({
          isLoggedIn,
          userId,
          isInitialized: true,
        });
      }
    };

    initializeAuth();

    // Setup listener for popup auth flow (desktop)
    const cleanupListener = setupAuthListener(async () => {
      console.log("Auth message received, checking status with server...");

      // More aggressive checking: retry multiple times with delay
      // This helps if the server needs time to save the session
      let attempts = 0;
      const maxAttempts = 3;
      let isAuthenticated = false;

      while (attempts < maxAttempts && !isAuthenticated) {
        attempts++;
        console.log(`Auth status check attempt ${attempts}`);

        // When auth message received, verify with server
        const { isLoggedIn, userId } = await checkSessionStatus();
        console.log("Auth status:", isLoggedIn, userId);

        if (isLoggedIn) {
          isAuthenticated = true;
          setAuthState((prevState) => ({
            ...prevState,
            isLoggedIn,
            userId,
          }));

          // Set session restored flag to trigger state restoration
          setSessionRestored(true);
        } else if (attempts < maxAttempts) {
          // Wait before trying again
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!isAuthenticated) {
        console.warn("Failed to verify authentication after multiple attempts");
      }
    });

    // Cleanup function
    return cleanupListener;
  }, []);

  // Update auth helper function
  const updateAuth = useCallback(async () => {
    const { isLoggedIn, userId } = await checkSessionStatus();
    setAuthState((prevState) => ({
      ...prevState,
      isLoggedIn,
      userId,
    }));
  }, []);

  // Login helper function - Modified to check for consent
  const login = useCallback((stateToSave) => {
    // Check if user has consented to terms and privacy policy
    const hasConsented = getFromLocalStorage("setlistScoutConsent");

    if (!hasConsented) {
      console.log(
        "User must accept terms and privacy policy before logging in"
      );
      return;
    }

    // Save state if needed
    if (stateToSave) {
      sessionStorage.setItem("concertCramState", JSON.stringify(stateToSave));
    }
    initiateSpotifyLogin();
  }, []);

  // Logout helper function
  const logout = useCallback(async () => {
    try {
      // Call server logout endpoint
      await axios.post(
        `${server_url}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Error logging out:", error);
    }

    setAuthState((prevState) => ({
      ...prevState,
      isLoggedIn: false,
      userId: null,
    }));
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...authState,
      updateAuth,
      login,
      logout,
      sessionRestored, // Add sessionRestored flag to context
    }),
    [authState, updateAuth, login, logout, sessionRestored]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};


// File: ./frontend/src/theme.js
// theme.js
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Bebas Neue', sans-serif",
    body: "'Inter', sans-serif",
  },
});

export default theme;

// File: ./frontend/src/utils/setlistHelpers.js
export const extractSetlistID = (listURL) => {
  const splitString = listURL.split("-");
  const setListID = splitString[splitString.length - 1].slice(0, -5);
  return setListID;
};


// File: ./frontend/src/utils/deviceDetection.js
/**
 * Detects if the current device is a mobile device
 * 
 * @returns {boolean} True if the current device is mobile, false otherwise
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// File: ./frontend/src/utils/storage.js
/**
 * Save data to localStorage with error handling
 * 
 * @param {string} key Storage key
 * @param {*} value Value to store (will be JSON-serialized)
 * @returns {boolean} Success status
 */
export const saveToLocalStorage = (key, value) => {
  try {
    const serializedValue = typeof value === 'string'
      ? value
      : JSON.stringify(value);

    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Retrieve data from localStorage with error handling
 * 
 * @param {string} key Storage key
 * @param {boolean} parse Whether to parse the value as JSON
 * @returns {*} Retrieved value or null if not found/error
 */
export const getFromLocalStorage = (key, parse = true) => {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return null;
    }

    return parse ? JSON.parse(value) : value;
  } catch (error) {
    console.error(`Error retrieving from localStorage [${key}]:`, error);
    return null;
  }
};

/**
 * Remove data from localStorage
 * 
 * @param {string} key Storage key to remove
 * @returns {boolean} Success status
 */
export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Save data to sessionStorage with error handling
 * 
 * @param {string} key Storage key
 * @param {*} value Value to store (will be JSON-serialized)
 * @returns {boolean} Success status
 */
export const saveToSessionStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving to sessionStorage [${key}]:`, error);
    return false;
  }
};

/**
 * Retrieve data from sessionStorage with error handling
 * 
 * @param {string} key Storage key
 * @returns {*} Retrieved value or null if not found/error
 */
export const getFromSessionStorage = (key) => {
  try {
    const value = sessionStorage.getItem(key);

    if (value === null) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`Error retrieving from sessionStorage [${key}]:`, error);
    return null;
  }
};

/**
 * Remove data from sessionStorage
 * 
 * @param {string} key Storage key to remove
 * @returns {boolean} Success status
 */
export const removeFromSessionStorage = (key) => {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from sessionStorage [${key}]:`, error);
    return false;
  }
};

// File: ./frontend/src/components/TracksHUD.jsx
import React from "react";
import {
  Button,
  Flex,
  Box,
  Divider,
  Heading,
  Image,
  Text,
  Link,
  Icon,
  VStack,
  Spinner,
  Fade,
} from "@chakra-ui/react";
import { ExternalLinkIcon, EmailIcon } from "@chakra-ui/icons";
import Track from "./Track";
import AlertMessage from "./AlertMessage";
import ProgressIndicator from "./ProgressIndicator";
import { useAuth } from "../hooks/useAuth";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import { getFromLocalStorage } from "../utils/storage";
import spotifyLogo from "../assets/Spotify_Full_Logo_RGB_Green.png";

export default function TracksHUD() {
  const { isLoggedIn, login } = useAuth();
  const { createPlaylist, playlistUrl, clearPlaylistUrl, isCreatingPlaylist } =
    useSpotify();
  const {
    spotifyData,
    tourData,
    loading,
    playlistNotification,
    setNotification,
    progress,
  } = useSetlist();

  // Determine if we should show the tracks section
  const showTracks = spotifyData?.length > 0 && !loading;

  // Clears prev playlist URL when a new search is initiated
  React.useEffect(() => {
    // Keep track of previous spotifyData length to detect new searches
    const handleNewSearch = () => {
      if (playlistUrl) {
        clearPlaylistUrl();
      }
    };
    // Add an event listener to clear playlistUrl when a new search starts
    window.addEventListener("new-search-started", handleNewSearch);
    // Clean up the event listener
    return () => {
      window.removeEventListener("new-search-started", handleNewSearch);
    };
  }, [clearPlaylistUrl, playlistUrl]);

  // Handle login button click
  const handleLoginClick = () => {
    // Check if user has already consented
    const hasConsented = getFromLocalStorage("setlistScoutConsent");

    if (hasConsented) {
      // If they have consented, proceed with login
      login({ spotifyData, tourData });
    } else {
      // We no longer need to open the consent modal here
      // The app-level modal will handle this
      // Just inform the user they need to accept terms first
      setNotification({
        message: "Please accept the Terms & Privacy Policy to continue",
        status: "info",
      });
    }
  };

  return (
    <Box width="full" maxW="100%">
      {/* Spotify Attribution - Visible initially and after loading is complete */}
      {!loading && (
        <VStack width="full">
          <Flex
            align="left"
            justify="left"
            flexWrap="wrap"
            gap={2}
            // mt={4}
            px={2}
          >
            <Text
              color="purple.400"
              fontWeight="bold"
              fontSize="sm"
              textAlign="left"
            >
              Track lookup and playlist creation powered by:
            </Text>
          </Flex>
          <Flex>
            <Link href="https://open.spotify.com" isExternal display="block">
              <Image
                mt={9}
                mb={9}
                src={spotifyLogo}
                alt="Spotify Logo"
                height="auto"
                width="200px"
                flexShrink={0}
                style={{ cursor: "pointer !important" }}
                _hover={{ cursor: "pointer !important" }}
              />
            </Link>
          </Flex>
        </VStack>
      )}

      {/* Divider - Only shown when there are tracks to display */}
      {showTracks && (
        <Box width="full">
          <Divider mb={6} mt={4} />
        </Box>
      )}

      {loading ? (
        <Box width="full" mb={{ base: 3, md: 6 }}>
          <ProgressIndicator isLoading={loading} progress={progress} />
        </Box>
      ) : (
        showTracks && (
          <Box width="full">
            {/* Track heading */}
            <Box mb={6} width="full">
              {tourData.tourName === "No Tour Info" ? (
                <Text size="md" fontWeight="semibold">
                  Tracks <Text as="strong">{tourData.bandName}</Text> has played
                  in last {tourData.totalShows} shows:
                </Text>
              ) : (
                <Text as="h4" size="md">
                  These are the tracks{" "}
                  <Text as="strong">{tourData.bandName}</Text> has played on the{" "}
                  "
                  <Text as="strong">
                    {tourData.tourName}
                    {!tourData.tourName.trim().toLowerCase().endsWith("tour") &&
                      " Tour"}
                  </Text>
                  ":
                </Text>
              )}
            </Box>

            {/* Login/Create Playlist Button */}
            <Flex direction="column" alignItems="center" mb={6} width="full">
              {!isLoggedIn ? (
                <VStack spacing={0} width="auto" maxW="md">
                  <Flex
                    align="center"
                    flexWrap="wrap"
                    justifyContent="center"
                    gap={2}
                    my={2}
                  >
                    <Button
                      size="sm"
                      width="auto"
                      px={4}
                      py={2}
                      bg="purple.400"
                      color="black"
                      variant="solid"
                      _hover={{
                        bg: "#purple.500",
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                      transition="all 0.2s ease"
                      borderRadius="full"
                      fontWeight="medium"
                      letterSpacing="0.5px"
                      flexShrink={0}
                      onClick={handleLoginClick}
                    >
                      Login
                    </Button>
                    <Text textAlign="center">to create playlist</Text>
                  </Flex>
                  <Text
                    textAlign="left"
                    fontSize="sm"
                    color="gray.500"
                    mt={2}
                    mb={4}
                  >
                    note: pending Spotify approval for public login. Please
                    email{" "}
                    <Box as="span" display="inline" whiteSpace="nowrap">
                      <Link
                        href="mailto:setlistscout@gmail.com"
                        color="teal.400"
                      >
                        setlistscout@gmail.com
                      </Link>
                    </Box>{" "}
                    to be a pre-approved beta user.
                  </Text>
                </VStack>
              ) : (
                <>
                  <VStack spacing={0} width="auto" maxW="md">
                    <Flex
                      align="center"
                      flexWrap="wrap"
                      justifyContent="center"
                      gap={2}
                      my={2}
                    >
                      <Button
                        size="sm"
                        width="auto"
                        px={4}
                        py={2}
                        bg="purple.400"
                        color="black"
                        variant="solid"
                        _hover={{
                          bg: "#purple.500",
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        }}
                        transition="all 0.2s ease"
                        borderRadius="full"
                        fontWeight="medium"
                        letterSpacing="0.5px"
                        flexShrink={0}
                        onClick={createPlaylist}
                        isDisabled={isCreatingPlaylist}
                      >
                        Create Playlist
                      </Button>
                    </Flex>
                  </VStack>

                  {/* Simple creating playlist indicator */}
                  {isCreatingPlaylist && (
                    <Flex
                      align="center"
                      mt={2}
                      p={2}
                      bg="gray.700"
                      borderRadius="md"
                    >
                      <Spinner size="sm" color="#1DB954" mr={2} />
                      <Text>Creating playlist...</Text>
                    </Flex>
                  )}
                </>
              )}

              {/* Playlist URL Link - Show if available */}
              {playlistUrl && (
                <Link
                  href={playlistUrl}
                  isExternal
                  mt={4}
                  color="#1DB954"
                  fontWeight="bold"
                  display="flex"
                  alignItems="center"
                >
                  View your playlist on Spotify <ExternalLinkIcon ml={1} />
                </Link>
              )}
            </Flex>

            {/* Tracks list */}
            <Box width="full">
              {spotifyData.map((item) => (
                <Track key={item.id} item={item} tourData={tourData} />
              ))}
            </Box>
          </Box>
        )
      )}

      {/* Playlist Notification Message - Keep outside the main section for visibility */}
      {playlistNotification && playlistNotification.message && (
        <AlertMessage
          status={playlistNotification.status}
          message={playlistNotification.message}
          onClose={() => setNotification({ message: "", status: "" })}
          width="full"
        />
      )}
    </Box>
  );
}


// File: ./frontend/src/components/About.jsx
import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link,
  UnorderedList,
  ListItem,
} from "@chakra-ui/react";

export default function About() {
  return (
    <Box>
      <VStack spacing={6} align="start">
        <Heading
          as="h1"
          size="xl"
          bgGradient="linear(to-r, teal.400, green.400)"
          bgClip="text"
        >
          About Setlist Scout
        </Heading>

        <Text fontFamily="body">
          Setlist Scout is a tool designed to help concert-goers prepare for
          upcoming shows by providing insights into what songs their favorite
          artists are playing on tour.
        </Text>

        <Heading as="h2" size="md" mt={4}>
          How It Works
        </Heading>

        <UnorderedList spacing={2} pl={4}>
          <ListItem>
            Search for your favorite artist using our search bar
          </ListItem>
          <ListItem>
            Setlist Scout looks up their recent shows on{" "}
            <Link href="https://www.setlist.fm" isExternal color="teal.400">
              Setlist.fm
            </Link>
            , finds the songs they've been playing on tour, and tallies them up
            (in order of highest likelihood)
          </ListItem>
          <ListItem>
            Login to{" "}
            <Link href="https://www.spotify.com" isExternal color="teal.400">
              Spotify
            </Link>{" "}
            to create a playlist of these songs and start cramming for the show!
          </ListItem>
        </UnorderedList>

        <Heading as="h2" size="md" mt={4}>
          Privacy
        </Heading>

        <Text>
          We only request the minimum Spotify permissions needed to create
          playlists on your behalf. We don't store any of your personal
          information beyond what's needed for the application to function.
        </Text>
      </VStack>
    </Box>
  );
}


// File: ./frontend/src/components/ProgressIndicator.jsx
// src/components/ProgressIndicator.jsx - No Emoji Version
import React from "react";
import { Box, VStack, Spinner, Text, Progress } from "@chakra-ui/react";

/**
 * Component to display progress updates during API requests
 *
 * @param {Object} props Component props
 * @param {boolean} props.isLoading Whether data is currently loading
 * @param {Object} props.progress Progress data { stage, message, percent }
 */
const ProgressIndicator = ({ isLoading, progress }) => {
  if (!isLoading) return null;

  return (
    <VStack spacing={4} width="100%" my={4}>
      <Box
        display="flex"
        alignItems="center"
        minHeight="24px" // Fixed height for message container
        width="100%"
      >
        <Spinner size="sm" mr={2} flexShrink={0} />
        <Text fontSize="md">{progress.message}</Text>
      </Box>

      <Box width="100%" height="20px">
        {" "}
        {/* Fixed height container for progress bar */}
        <Progress
          value={progress.percent !== null ? progress.percent : 0}
          size="sm"
          width="100%"
          colorScheme="teal" // Keep the original teal color for consistency
          hasStripe
          isAnimated
          borderRadius="md"
        />
      </Box>
    </VStack>
  );
};

export default ProgressIndicator;


// File: ./frontend/src/components/UserInput.jsx
// src/components/UserInput.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  HStack,
  Input,
  Image,
  Box,
  List,
  ListItem,
  Text,
  Spinner,
  Flex,
} from "@chakra-ui/react";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";

/**
 * Component for artist search input
 * - Uses Deezer API for artist search
 * - Uses Spotify API for setlist and playlist functionality
 */
export default function UserInput() {
  const { fetchTourData, loading, searchForArtistsDeezer } = useSetlist();
  const { clearPlaylistUrl } = useSpotify();
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedArtist && selectedArtist.name === artistQuery) return;

    const debounceTimeout = setTimeout(() => {
      if (artistQuery.length >= 1) {
        fetchArtistSuggestions(artistQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [artistQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Fetches artist suggestions from Deezer
   * @param {string} query The artist search query
   * @async
   */
  const fetchArtistSuggestions = async (query) => {
    try {
      setSearchLoading(true);
      const results = await searchForArtistsDeezer(query);
      setSuggestions(results || []);
    } catch (error) {
      console.error("Error fetching artist suggestions:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Fetches tour information for a selected artist
   * @param {Object} artist The selected artist object
   * @async
   */
  const handleArtistSelect = async (artist) => {
    // Dispatch an event to notify that a new search is starting
    window.dispatchEvent(new Event("new-search-started"));

    // Clear the playlist URL when a new artist is selected
    if (clearPlaylistUrl) {
      clearPlaylistUrl();
    }

    setArtistQuery(artist.name);
    setSuggestions([]);
    setSelectedArtist(artist);
    await fetchTourData(artist);
    // Reset the form
    setArtistQuery("");
    setSelectedArtist(null);
  };

  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      maxWidth="100%"
      mx="auto"
      mb={{ base: 2, md: 0 }}
      alignItems="center"
      justifyContent="center"
    >
      <Text fontWeight="bold" fontSize="sm" mb={2}>
        Enter an Artist to see what they're playing live:
      </Text>

      <Input
        placeholder="artist name"
        value={artistQuery}
        onChange={(e) => setArtistQuery(e.target.value)}
        size="lg"
        variant="outline"
        width="100%"
        disabled={loading}
      />

      {searchLoading && (
        <Box mt={2}>
          <Spinner size="sm" />
          <Text as="span" ml={2}>
            Searching...
          </Text>
        </Box>
      )}

      {/* Render suggestions in a "dropdown" style */}
      {suggestions.length > 0 && (
        <Box
          position="absolute"
          zIndex="10"
          bg="gray.700"
          mt={2}
          width="100%"
          borderRadius="md"
          overflow="hidden"
        >
          <List spacing={0}>
            {suggestions.map((artist) => (
              <ListItem
                key={artist.id}
                px={4}
                py={2}
                _hover={{ backgroundColor: "gray.600" }}
              >
                <Flex width="100%" justify="space-between" align="center">
                  <Box
                    onClick={() => handleArtistSelect(artist)}
                    flex="1"
                    _hover={{ cursor: "pointer" }}
                  >
                    <HStack spacing={3}>
                      <Image
                        src={artist.image?.url || "https://placehold.co/40"}
                        boxSize="40px"
                        alt={artist.name}
                        borderRadius={["2px", "2px", "4px"]}
                      />
                      <Text>{artist.name}</Text>
                    </HStack>
                  </Box>
                </Flex>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}


// File: ./frontend/src/components/NavBar.jsx
// File: ./src/components/NavBar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  Flex,
  Spacer,
  Button,
  Text,
  useColorModeValue,
  Stack,
  IconButton,
  Collapse,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";
import { useAuth } from "../hooks/useAuth";
import { getFromLocalStorage } from "../utils/storage";

function NavBar() {
  const { isOpen, onToggle } = useDisclosure();
  const { isLoggedIn, login, logout } = useAuth();
  const location = useLocation();
  const bgColor = useColorModeValue("gray.800", "gray.900");
  const textColor = useColorModeValue("white", "gray.200");
  const toast = useToast();

  // Handle login click
  const handleLoginClick = (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      logout();
    } else {
      const hasConsented = getFromLocalStorage("setlistScoutConsent");
      if (hasConsented) {
        login();
      } else {
        // Instead of opening the modal directly, show a toast notification
        // The app-level modal will appear naturally on initial load
        toast({
          title: "Consent Required",
          description: "Please accept the Terms & Privacy Policy first",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  // Check if we should show the link based on consent status
  // For Legal pages, we always show them even without consent
  const shouldShowLink = (href) => {
    const hasConsented = getFromLocalStorage("setlistScoutConsent");
    return hasConsented || href.includes("/legal");
  };

  return (
    <Box>
      <Flex
        bg={bgColor}
        color={textColor}
        minHeight="70px"
        py={{ base: 4 }}
        px={{ base: 0 }} // Changed from px={{ base: 4 }} to remove horizontal padding
        align={"center"} // Changed from flex-start to center for vertical alignment
        width="100%"
      >
        {/* App title - left-aligned on all screen sizes */}
        <Flex flex={{ base: 1 }} ml={0} align="center">
          <Text
            fontFamily="heading"
            fontSize="6xl"
            letterSpacing="1px"
            color="purple.400"
            pt={3}
            pb={2}
            ml={4} // Small margin to prevent it from touching the edge
            as={Link}
            to="/"
            whiteSpace="nowrap" // Prevent text wrapping
          >
            Setlist Scout
          </Text>
          <Spacer />
        </Flex>

        {/* Right-aligned hamburger menu for mobile */}
        <Flex
          display={{ base: "flex", md: "none" }}
          position="absolute"
          right="4"
          top="3"
        >
          <IconButton
            onClick={onToggle}
            icon={
              isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
            }
            variant={"ghost"}
            aria-label={"Toggle Navigation"}
          />
        </Flex>

        {/* Right-aligned menu items for desktop */}
        <Stack
          direction={"row"}
          spacing={4}
          display={{ base: "none", md: "flex" }}
          align="center"
          mr={4}
        >
          {/* Navigation Links */}
          <DesktopNav location={location} />

          {/* Login/Logout Button */}
          <Box>
            <Link to="#" onClick={handleLoginClick}>
              <Box
                p={2}
                fontSize={"md"}
                fontWeight={500}
                color={"white"}
                _hover={{
                  textDecoration: "none",
                  color: "purple.600",
                }}
              >
                {isLoggedIn ? "Logout" : "Login"}
              </Box>
            </Link>
          </Box>
        </Stack>
      </Flex>
      <Collapse in={isOpen} animateOpacity>
        <MobileNav
          location={location}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLoginClick}
          logout={logout}
        />
      </Collapse>
    </Box>
  );
}

const DesktopNav = ({ location }) => {
  const linkColor = "white";
  const linkHoverColor = "purple.600";
  const activeColor = "purple.400";

  return (
    <Stack direction={"row"} spacing={4}>
      {NAV_ITEMS.map((navItem) => {
        const isActive = location.pathname === navItem.href;
        return (
          <Box key={navItem.label}>
            <Link to={navItem.href}>
              <Box
                p={2}
                fontSize={"md"}
                fontWeight={500}
                color={isActive ? activeColor : linkColor}
                _hover={{
                  textDecoration: "none",
                  color: linkHoverColor,
                }}
              >
                {navItem.label}
              </Box>
            </Link>
          </Box>
        );
      })}
    </Stack>
  );
};

const MobileNavItem = ({ label, href, isActive }) => {
  const color = isActive ? "teal.400" : "white";

  return (
    <Stack spacing={4}>
      <Flex
        py={2}
        as={Link}
        to={href}
        justify={"space-between"}
        align={"center"}
        _hover={{
          textDecoration: "none",
        }}
      >
        <Text fontWeight={600} color={color}>
          {label}
        </Text>
      </Flex>
    </Stack>
  );
};

const MobileNav = ({ location, isLoggedIn, handleLogin, logout }) => {
  return (
    <Stack bg={"gray.800"} p={4} display={{ md: "none" }}>
      {NAV_ITEMS.map((navItem) => (
        <MobileNavItem
          key={navItem.label}
          {...navItem}
          isActive={location.pathname === navItem.href}
        />
      ))}
      <Flex
        py={2}
        as={Link}
        to={"#"}
        justify={"space-between"}
        align={"center"}
        _hover={{
          textDecoration: "none",
        }}
        onClick={handleLogin}
      >
        <Text fontWeight={600} color={"white"}>
          {isLoggedIn ? "Logout" : "Login"}
        </Text>
      </Flex>
    </Stack>
  );
};

// Updated NAV_ITEMS - no change, just for completeness
const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Privacy/Terms",
    href: "/legal",
  },
];

export default NavBar;


// File: ./frontend/src/components/AlertMessage.jsx
// src/components/AlertMessage.jsx
import React from "react";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from "@chakra-ui/react";

/**
 * Reusable alert component for notifications and errors
 *
 * @param {Object} props Component props
 * @param {string} props.status Alert status (error, success, warning, info)
 * @param {string} props.title Optional title for the alert
 * @param {string} props.message Main alert message
 * @param {Function} props.onClose Function to call when closed
 * @param {Object} props.mt Margin top
 * @param {Object} props.mb Margin bottom
 * @param {Object} props.rest Additional props to pass to the Alert component
 */
const AlertMessage = ({
  status,
  title,
  message,
  onClose,
  mt = 4,
  mb = 4,
  ...rest
}) => {
  if (!message) return null;

  return (
    <Alert
      status={status}
      variant="solid"
      mt={mt}
      mb={mb}
      borderRadius="md"
      position="relative"
      {...rest}
    >
      <AlertIcon />

      {title && <AlertTitle mr={2}>{title}:</AlertTitle>}

      <AlertDescription flex="1">{message}</AlertDescription>

      {onClose && (
        <CloseButton
          position="absolute"
          right="8px"
          top="8px"
          onClick={onClose}
        />
      )}
    </Alert>
  );
};

export default AlertMessage;


// File: ./frontend/src/components/ConsentModal.jsx
// File: ./src/components/ConsentModal.jsx
import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Checkbox,
  Link,
  Flex,
  useToast,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { getFromLocalStorage, saveToLocalStorage } from "../utils/storage";
import { logConsent } from "../api/consentService";

/**
 * Consent Modal Component
 * - Displays End User Agreement and Privacy Policy
 * - Requires user consent before using Spotify features
 * - Allows viewing full legal documents before consenting
 * - Stores consent in localStorage and on server
 */
const ConsentModal = ({ isOpen, onClose }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Handle user consent
  const handleConsent = async () => {
    if (agreedToTerms && agreedToPrivacy) {
      setIsSubmitting(true);

      // Create consent data record
      const consentData = {
        consented: true,
        agreedToTerms: true,
        agreedToPrivacy: true,
        date: new Date().toISOString(),
      };

      try {
        // Log consent to server
        const result = await logConsent(consentData);

        // Save to localStorage with server consentId if available
        if (result.success) {
          saveToLocalStorage("setlistScoutConsent", {
            ...consentData,
            consentId: result.consentId,
          });
        } else {
          // Fall back to localStorage only if server logging failed
          saveToLocalStorage("setlistScoutConsent", consentData);

          // Show silent warning but don't block the user
          console.warn(
            "Server consent logging failed, using localStorage only"
          );
        }

        // Call the provided onClose function
        onClose();
      } catch (error) {
        console.error("Error during consent logging:", error);

        // Fall back to localStorage only in case of error
        saveToLocalStorage("setlistScoutConsent", consentData);

        toast({
          title: "Note",
          description:
            "Your consent was saved locally. Some features may require reconnecting later.",
          status: "info",
          duration: 5000,
          isClosable: true,
        });

        // Call the provided onClose function
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handle clicking on legal links - temporarily close modal
  const handleLegalLinkClick = (path) => {
    // Save modal state to reopen it when returning from legal pages
    sessionStorage.setItem("returnToConsent", "true");

    // Temporarily close the modal
    onClose();

    // Navigate to the legal page
    navigate(path);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing by clicking outside
      closeOnOverlayClick={false}
      closeOnEsc={false}
      size="xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader borderBottom="1px" borderColor="gray.200">
          Welcome to Setlist Scout
        </ModalHeader>

        <ModalBody py={4}>
          <VStack spacing={4} align="stretch">
            <Text>
              Before you can use our service, we need your consent to our End
              User Agreement and Privacy Policy. These agreements include
              important information about how we interact with Spotify's API on
              your behalf.
            </Text>

            <Tabs variant="enclosed" colorScheme="teal">
              <TabList>
                <Tab>End User Agreement</Tab>
                <Tab>Privacy Policy</Tab>
              </TabList>

              <TabPanels>
                <TabPanel maxH="300px" overflowY="auto">
                  <Box p={2}>
                    <Text fontWeight="bold" mb={2}>
                      End User Agreement (Summary)
                    </Text>
                    <Text mb={2}>
                      By using Setlist Scout, you agree to this End User
                      Agreement. Key points include:
                    </Text>
                    <VStack align="stretch" spacing={2} mb={4}>
                      <Text>
                        • Setlist Scout accesses Spotify data with your
                        permission
                      </Text>
                      <Text>
                        • We request the "playlist-modify-public" scope to
                        create playlists on your behalf
                      </Text>
                      <Text>
                        • Spotify is a third-party beneficiary of this agreement
                      </Text>
                      <Text>
                        • Setlist Scout is solely responsible for its services
                      </Text>
                      <Text>
                        • You agree not to modify or reverse-engineer Spotify
                        content
                      </Text>
                      <Text>
                        • You are responsible for maintaining account security
                      </Text>
                      <Text>
                        • Logging out will remove your data from our system
                      </Text>
                    </VStack>
                    <Button
                      rightIcon={<ExternalLinkIcon />}
                      colorScheme="teal"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLegalLinkClick("/legal")}
                    >
                      Read full agreement
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel maxH="300px" overflowY="auto">
                  <Box p={2}>
                    <Text fontWeight="bold" mb={2}>
                      Privacy Policy (Summary)
                    </Text>
                    <Text mb={2}>
                      We value your privacy. Our Privacy Policy explains how we
                      handle your data:
                    </Text>
                    <VStack align="stretch" spacing={2} mb={4}>
                      <Text>
                        • We store only the minimum data needed (Spotify User
                        ID, access tokens)
                      </Text>
                      <Text>
                        • We request only the "playlist-modify-public" scope to
                        create playlists on your behalf
                      </Text>
                      <Text>
                        • Authentication data is stored in encrypted sessions
                        that expire after 24 hours
                      </Text>
                      <Text>
                        • We use a session cookie to maintain your login state
                      </Text>
                      <Text>
                        • Logging out will disconnect your Spotify account and
                        remove your data from our systems
                      </Text>
                      <Text>
                        • We do not analyze your listening habits or store
                        search history
                      </Text>
                    </VStack>
                    <Button
                      rightIcon={<ExternalLinkIcon />}
                      colorScheme="teal"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLegalLinkClick("/legal?tab=1")}
                    >
                      Read full policy
                    </Button>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Box mt={2}>
              <Flex mb={2}>
                <Checkbox
                  colorScheme="teal"
                  isChecked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  mr={2}
                />
                <Text>
                  I agree to the{" "}
                  <Link
                    as="span"
                    color="teal.500"
                    onClick={() => handleLegalLinkClick("/legal")}
                    cursor="pointer"
                  >
                    End User Agreement
                  </Link>
                </Text>
              </Flex>
              <Flex>
                <Checkbox
                  colorScheme="teal"
                  isChecked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  mr={2}
                />
                <Text>
                  I agree to the{" "}
                  <Link
                    as="span"
                    color="teal.500"
                    onClick={() => handleLegalLinkClick("/legal?tab=1")}
                    cursor="pointer"
                  >
                    Privacy Policy
                  </Link>
                </Text>
              </Flex>
            </Box>

            <Text fontSize="sm" color="gray.500">
              Spotify is a third-party beneficiary of these agreements and is
              entitled to enforce their terms.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px" borderColor="gray.200">
          <Button
            colorScheme="teal"
            onClick={handleConsent}
            isDisabled={!agreedToTerms || !agreedToPrivacy || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Saving..."
          >
            I Accept
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConsentModal;


// File: ./frontend/src/components/Contact.jsx
import React from "react";
import { Box, Heading, Text, VStack, Link, Flex, Icon } from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";

export default function Contact() {
  return (
    <Box>
      <VStack spacing={6} align="start">
        <Heading
          as="h1"
          size="xl"
          bgGradient="linear(to-r, teal.400, green.400)"
          bgClip="text"
        >
          Contact Us
        </Heading>

        <Text>
          Have feedback, feature requests, or found a bug? We'd love to hear
          from you!
        </Text>

        <Flex align="center" mt={4}>
          <Icon as={EmailIcon} mr={2} color="teal.400" />
          <Link href="mailto:setlistscout@gmail.com" color="teal.400">
            setlistscout@gmail.com
          </Link>
        </Flex>

        <Text mt={4}>For technical issues, please include details about:</Text>
        <Box pl={4}>
          <Text>• What browser you're using</Text>
          <Text>• What you were trying to do</Text>
          <Text>• Any error messages you received</Text>
        </Box>
      </VStack>
    </Box>
  );
}


// File: ./frontend/src/components/Track.jsx
import React, { useEffect, useState } from "react";
import {
  Flex,
  Box,
  Text,
  Image,
  Link,
  CircularProgress,
  CircularProgressLabel,
  Badge,
  useBreakpointValue,
  useColorModeValue,
  Tooltip,
  Button,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";

// Motion-enhanced Chakra components
const MotionFlex = motion(Flex);
const MotionBadge = motion(Badge);
const MotionText = motion(Text);

/**
 * Enhanced Track component with modern data visualization and balanced animations
 */
export default function Track({ item, tourData }) {
  // State for animated percentage
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  // Determine if this is a mobile layout - moved earlier to prevent layout shifts
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Theme colors
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const statsBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  // Spotify brand green color
  const spotifyGreen = "#1DB954";
  const spotifyGreenHover = "#1AA34A";

  // Animate the percentage value on mount - optimized animation speed
  useEffect(() => {
    const targetPercentage = calculateLikelihood();
    let startTime = null;
    let animationFrameId = null;

    // Animation function
    const animateProgress = (timestamp) => {
      if (!startTime) startTime = timestamp;

      // Calculate elapsed time
      const elapsedTime = timestamp - startTime;
      // Animation duration (reduced from 2000ms to 800ms)
      const duration = 800;
      // Calculate raw progress (0 to 1)
      const rawProgress = Math.min(elapsedTime / duration, 1);

      // Linear animation - no easing
      const currentValue = Math.round(rawProgress * targetPercentage);
      setAnimatedPercentage(currentValue);

      // Continue animation until complete
      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(animateProgress);
      }
    };

    // Start animation immediately
    animationFrameId = requestAnimationFrame(animateProgress);

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  /**
   * Convert a Spotify URI ("spotify:track:12345") into an open.spotify.com link
   */
  const getSpotifyLink = (uri) => {
    const trackId = uri?.split(":").pop();
    return `https://open.spotify.com/track/${trackId}`;
  };

  /**
   * Clean extraneous info from track titles
   */
  const cleanSongTitle = (title) => {
    if (!title) return title;
    const patterns = [
      /\s*-\s*(Remaster(ed)?|Remix(ed)?|Re-?master|Mix).*$/i,
      /\s*-\s*\d{4}(\s+.+)?$/i,
      /\s*-\s*(Deluxe|Special|Anniversary|Expanded).*$/i,
      /\s*-\s*(Mono|Stereo|Live|Acoustic|Single Version|Album Version|Radio Edit).*$/i,
      /\s*-\s*\(.*\)$/i,
      /\s*\(Remaster(ed)?|Remix(ed)?\).*$/i,
      /\s*\(\d{4}(\s+.+)?\)$/i,
      /\s+(Deluxe(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Special(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Anniversary(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Expanded(\s+Edition|\s+Version)?)\s*$/i,
    ];
    let cleanedTitle = title;
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, "");
    }
    return cleanedTitle.trim();
  };

  /**
   * Clean extraneous info from album titles
   */
  const cleanAlbumTitle = (title) => {
    if (!title) return title;
    const patterns = [
      /\s*-\s*(Remaster(ed)?|Remix(ed)?|Re-?master|Mix).*$/i,
      /\s*-\s*\d{4}(\s+.+)?$/i,
      /\s*-\s*(Deluxe|Special|Anniversary|Expanded).*$/i,
      /\s*-\s*(Mono|Stereo|Live|Acoustic|Single Version|Album Version|Radio Edit).*$/i,
      /\s*-\s*\(.*\)$/i,
      /\s*\(Remaster(ed)?|Remix(ed)?\).*$/i,
      /\s*\(\d{4}(\s+.+)?\)$/i,
      /\s+(Deluxe(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Special(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Anniversary(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Expanded(\s+Edition|\s+Version)?)\s*$/i,
    ];
    let cleanedTitle = title;
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, "");
    }
    return cleanedTitle.trim();
  };

  /**
   * Calculate the likelihood percentage (capped at 100%)
   */
  const calculateLikelihood = () => {
    const percentage = Math.round((item.count / tourData.totalShows) * 100);
    return Math.min(percentage, 100);
  };

  /**
   * Return the times played, capped at total shows
   */
  const getDisplayCount = () => {
    return Math.min(item.count, tourData.totalShows);
  };

  /**
   * Get color scheme based on likelihood percentage
   */
  const getLikelihoodColor = () => {
    const percentage = calculateLikelihood();
    if (percentage >= 80) return "purple";
    if (percentage >= 60) return "blue";
    if (percentage >= 40) return "yellow";
    if (percentage >= 20) return "orange";
    return "red";
  };

  /**
   * Get text for likelihood assessment
   */
  const getLikelihoodText = () => {
    const percentage = calculateLikelihood();
    if (percentage >= 80) return "Very Likely";
    if (percentage >= 60) return "Likely";
    if (percentage >= 40) return "Possible";
    if (percentage >= 20) return "Rare";
    return "Very Rare";
  };

  // Provide a fallback cover image if none is available
  const albumCover = item.image?.url
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Likelihood percentage and color
  const percentage = calculateLikelihood();
  const likelihoodColor = getLikelihoodColor();

  // Skip animation if isMobile is undefined (prevents layout shift)
  if (isMobile === undefined) {
    return null; // Render nothing until breakpoint is determined
  }

  return (
    <MotionFlex
      p={3}
      bg={bgColor}
      borderRadius="none"
      boxShadow="sm"
      width="100%"
      my={2}
      align="center"
      justify="space-between"
      direction={isMobile ? "column" : "row"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} // Reduced from 0.8 to 0.4
    >
      {/* Left section: Album art + Track info */}
      <Flex
        align="center"
        width={isMobile ? "100%" : "60%"}
        mb={isMobile ? 3 : 0}
      >
        {/* Album artwork - no animation per Spotify guidelines */}
        <Box mr={4}>
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="64px"
            objectFit="cover"
            borderRadius="md"
            boxShadow="md"
          />
        </Box>

        {/* Track info */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color={textColor} noOfLines={1}>
            {item.songName
              ? cleanSongTitle(item.songName)
              : `${item.song ?? "Unknown"} (No Spotify match)`}
          </Text>

          <Text fontSize="sm" color={mutedColor} noOfLines={1}>
            {item.artistName || item.artist || "Unknown Artist"}
          </Text>

          {item.albumName && (
            <Text fontSize="xs" color={mutedColor} noOfLines={1}>
              {cleanAlbumTitle(item.albumName)}
            </Text>
          )}
        </Box>
      </Flex>

      {/* Right section: Enhanced likelihood HUD */}
      <MotionFlex
        bg={statsBg}
        borderRadius="md"
        p={2}
        width={isMobile ? "100%" : "240px"}
        align="center"
        justify="space-between"
        boxShadow="none"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }} // Reduced from 0.65/0.2 to 0.35/0.1
      >
        {/* Circular progress to visualize likelihood */}
        <Box position="relative">
          <CircularProgress
            value={animatedPercentage}
            size="55px"
            thickness="5px"
            color={`${likelihoodColor}.400`}
            trackColor={useColorModeValue("gray.100", "gray.600")}
          >
            <CircularProgressLabel fontWeight="bold" fontSize="xs">
              {animatedPercentage}%
            </CircularProgressLabel>
          </CircularProgress>
        </Box>

        {/* Likelihood assessment, show count, and Spotify button */}
        <Flex
          direction="column"
          mx={2}
          width="100%"
          height="100%"
          justify="space-between"
        >
          <Badge
            colorScheme={likelihoodColor}
            mb={1}
            px={2}
            alignSelf="flex-start"
          >
            {getLikelihoodText()}
          </Badge>

          <Text fontSize="xs" color={mutedColor} mb={1}>
            {getDisplayCount()} of {tourData.totalShows} shows
          </Text>

          {/* Spotify Button - with exact Spotify brand green */}
          {item.uri && (
            <Button
              as="a"
              href={getSpotifyLink(item.uri)}
              size="xs"
              bg={spotifyGreen}
              color="black"
              width="100%"
              height="24px"
              mt={1}
              fontWeight="medium"
              fontSize="xs"
              target="_blank"
              rel="noopener noreferrer"
              _hover={{ bg: spotifyGreenHover, color: "black" }}
            >
              OPEN SPOTIFY
            </Button>
          )}
        </Flex>
      </MotionFlex>
    </MotionFlex>
  );
}


// File: ./frontend/src/layouts/MainLayout.jsx
// src/layouts/MainLayout.jsx
import React from "react";
import { Box, Container, Text, Link, VStack } from "@chakra-ui/react";
import AlertMessage from "../components/AlertMessage";
import { useSetlist } from "../hooks/useSetlist";

export default function MainLayout({ children }) {
  const { error, clearError } = useSetlist();

  return (
    <Box
      bg="gray.900"
      color="white"
      display="flex"
      flexDirection="column"
      minH="100vh"
      width="100%"
    >
      {/* Main content - will grow to fill available space */}
      <Box flex="1">
        <Container
          maxW="container.xl"
          px={{ base: 2, md: 4 }}
          py={{ base: 3, md: 5 }}
          width="100%"
        >
          {error && (
            <AlertMessage
              status="error"
              title="Error"
              message={error}
              onClose={clearError}
            />
          )}

          {children}
        </Container>
      </Box>

      {/* Footer - won't flex grow */}
      <Box as="footer" textAlign="center" fontSize="sm" opacity={0.8} p={4}>
        <VStack spacing={2}>
          <Text>
            This app uses the Spotify API but is not endorsed, certified, or
            otherwise approved by Spotify. Spotify is a registered trademark of
            Spotify AB.
          </Text>
          <Text>
            Please see{" "}
            <Link
              href="https://developer.spotify.com/policy"
              color="blue.300"
              isExternal
            >
              Spotify Developer Policy
            </Link>{" "}
            and{" "}
            <Link
              href="https://developer.spotify.com/documentation/design"
              color="blue.300"
              isExternal
            >
              Brand Guidelines
            </Link>{" "}
            for more info.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}


// File: ./frontend/src/hooks/useDeezer.js
// src/hooks/useDeezer.js
import { useState } from "react";

/**
 * Hook for interacting with the Deezer API
 */
export const useDeezer = () => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Clears the current playlist URL
   */
  const clearPlaylistUrl = () => {
    setPlaylistUrl("");
  };

  /**
   * Searches for an artist on Deezer
   * @param {string} query - The search query
   * @returns {Promise<Array>} - Array of artist objects
   */
  const searchForArtists = async (query) => {
    try {
      setLoading(true);
      setError(null);

      // Deezer API doesn't require authentication for basic search
      const response = await fetch(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        throw new Error(`Deezer API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform Deezer data to match your expected format
      return data.data.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: { url: artist.picture_medium },
        url: artist.link
      }));
    } catch (err) {
      console.error("Error searching for artists:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets top tracks for an artist
   * @param {string} artistId - The Deezer artist ID
   * @returns {Promise<Array>} - Array of track objects
   */
  const getArtistTopTracks = async (artistId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=10`);

      if (!response.ok) {
        throw new Error(`Deezer API error: ${response.status}`);
      }

      const data = await response.json();

      return data.data.map(track => ({
        id: track.id,
        name: track.title,
        album: {
          name: track.album.title,
          image: { url: track.album.cover_medium }
        },
        artists: [{ name: track.artist.name }],
        duration_ms: track.duration * 1000, // Deezer uses seconds, convert to ms
        preview_url: track.preview
      }));
    } catch (err) {
      console.error("Error getting artist top tracks:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    playlistUrl,
    setPlaylistUrl,
    clearPlaylistUrl,
    loading,
    error,
    searchForArtists,
    getArtistTopTracks
  };
};

// File: ./frontend/src/hooks/useAuth.js
// File: ./frontend/src/hooks/useAuth.js
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getFromLocalStorage } from '../utils/storage';
import { useToast } from '@chakra-ui/react';

/**
 * Custom hook for authentication operations
 * - Adds consent check to login flow
 * - Provides toast notifications for user feedback
 * - Integrates with the central AuthContext for state management
 * 
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const authContext = useContext(AuthContext);
  const toast = useToast();

  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Get all properties from the auth context
  const {
    login: originalLogin,
    logout: originalLogout,
    isLoggedIn,
    userId,
    isInitialized,
    sessionRestored,
    updateAuth
  } = authContext;

  // Enhanced login function that checks for user consent first
  const login = useCallback(
    (stateToSave) => {
      // Check if user has consented to terms and privacy policy
      const hasConsented = getFromLocalStorage("setlistScoutConsent");

      if (!hasConsented) {
        // If no consent, don't proceed with login
        toast({
          title: "Consent Required",
          description: "You must accept our Terms and Privacy Policy before logging in",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // If user has consented, proceed with the original login function
      originalLogin(stateToSave);
    },
    [originalLogin, toast]
  );

  // Enhanced logout function with success feedback
  const logout = useCallback(() => {
    originalLogout();

    // Provide feedback to the user
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }, [originalLogout, toast]);

  return {
    // Pass through the state properties
    isLoggedIn,
    userId,
    isInitialized,
    sessionRestored,

    // Include enhanced methods
    login,
    logout,
    updateAuth
  };
};

// File: ./frontend/src/hooks/useSpotify.js
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
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  /**
   * Creates a Spotify playlist from the current songs
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

    // Set creating playlist state to true
    setIsCreatingPlaylist(true);

    try {
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
    clearPlaylistUrl,
    isCreatingPlaylist
  };
};

// File: ./frontend/src/hooks/useSetlist.js
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

// File: ./frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


// File: ./frontend/src/App.jsx
// File: ./src/App.jsx
import React, { useState, useEffect } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import theme from "./theme";
import "./App.css";
import NavBar from "./components/NavBar";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import ConsentModal from "./components/ConsentModal";
import { AuthProvider } from "./context/AuthContext";
import { SetlistProvider } from "./context/SetlistContext";
import { getFromLocalStorage } from "./utils/storage";

export const server_url =
  process.env.NODE_ENV === "production"
    ? "" // Empty string means use relative URLs like '/api/endpoint'
    : "http://localhost:3000"; // For local development

// AppContent component to use location hooks (can't use them directly in App)
function AppContent() {
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const location = useLocation();

  // Check for consent on initial load and route changes
  useEffect(() => {
    const hasConsented = getFromLocalStorage("setlistScoutConsent");

    // Only show modal if not on a legal page and not consented
    if (!hasConsented && !location.pathname.includes("/legal")) {
      setIsConsentModalOpen(true);
    } else {
      setIsConsentModalOpen(false);
    }

    // Check if returning from legal page with consent pending
    if (sessionStorage.getItem("returnToConsent") === "true") {
      // Only reopen if not on legal page
      if (!location.pathname.includes("/legal")) {
        sessionStorage.removeItem("returnToConsent");
        setIsConsentModalOpen(true);
      }
    }
  }, [location.pathname]);

  // Handle consent modal close
  const handleConsentModalClose = () => {
    setIsConsentModalOpen(false);
  };

  return (
    <>
      <MainLayout>
        <NavBar />
        {/* Add ConsentModal at the app level */}
        <ConsentModal
          isOpen={isConsentModalOpen}
          onClose={handleConsentModalClose}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal" element={<Legal />} />
        </Routes>
      </MainLayout>
    </>
  );
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <SetlistProvider>
          <Router>
            <AppContent />
          </Router>
        </SetlistProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;


// File: ./frontend/src/api/sseService.js
// File: ./frontend/src/api/sseService.js
import { server_url } from "../App";

/**
 * Service for handling Server-Sent Events connection
 */
class EventSourceService {
  constructor() {
    this.eventSource = null;
    this.clientId = null;
    this.listeners = new Map();
    this.connectionPromise = null;
  }

  /**
   * Connect to the SSE endpoint
   * 
   * @returns {Promise<string>} Promise resolving to client ID
   */
  connect() {
    // Only create one connection
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Close any existing connection
        this.disconnect();

        // Create new EventSource connection
        this.eventSource = new EventSource(`${server_url}/sse/connect`);

        // Handle connection open
        this.eventSource.onopen = () => {
          console.log('SSE connection established');
        };

        // Handle messages
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('SSE message received:', data);

            // Handle initial connection message to get clientId
            if (data.type === 'connection') {
              this.clientId = data.clientId;
              resolve(this.clientId);
            }

            // Notify all listeners
            this.notifyListeners(data);

            // If process is complete or has error, close the connection
            if (data.type === 'complete' || data.type === 'error') {
              this.disconnect();
            }
          } catch (error) {
            console.error('Error processing SSE message:', error);
          }
        };

        // Handle errors
        this.eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          this.notifyListeners({ type: 'connection_error', message: 'Connection to server lost' });

          // If we haven't resolved the clientId promise yet, reject it
          if (!this.clientId) {
            reject(new Error('Failed to establish SSE connection'));
            this.connectionPromise = null;
          }

          this.disconnect();
        };
      } catch (error) {
        console.error('Error setting up SSE connection:', error);
        reject(error);
        this.connectionPromise = null;
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionPromise = null;
    this.clientId = null;
  }

  /**
   * Add a listener for SSE events
   * 
   * @param {string} id Unique identifier for this listener
   * @param {Function} callback Function to call with event data
   */
  addListener(id, callback) {
    this.listeners.set(id, callback);
  }

  /**
   * Remove a listener
   * 
   * @param {string} id Listener ID to remove
   */
  removeListener(id) {
    this.listeners.delete(id);
  }

  /**
   * Notify all listeners of an event
   * 
   * @param {Object} data Event data
   * @private
   */
  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in SSE listener callback:', error);
      }
    });
  }

  /**
   * Get the current client ID
   * 
   * @returns {string|null} Current client ID or null if not connected
   */
  getClientId() {
    return this.clientId;
  }
}

// Create singleton instance
const eventSourceService = new EventSourceService();
export default eventSourceService;

// File: ./frontend/src/api/apiClient.js
import axios from 'axios';
import { server_url } from "../App";

const apiClient = axios.create({
  baseURL: server_url,
  withCredentials: true
});

// Request interceptor to handle token refreshing
apiClient.interceptors.request.use(
  async (config) => {
    // No longer need to add tokens to the Authorization header
    // The session cookie will be automatically included
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      // Redirect to login or update auth state
      const authContext = useContext(AuthContext);
      if (authContext) {
        authContext.updateAuth();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// File: ./frontend/src/api/playlistService.js
import axios from 'axios';
import { server_url } from "../App";



/**
 * Creates a Spotify playlist from the provided tracks
 * - Shows progress indicator for large playlists
 * - Handles batching on the server side
 * 
 * @param {Object} params Parameters for playlist creation
 * @param {Array<string>} params.trackIds List of Spotify track URIs
 * @param {string} params.bandName Band name for the playlist title
 * @param {string} params.tourName Tour name for the playlist title
 * @returns {Promise<Object>} Promise resolving to playlist creation result
 */
export const createPlaylist = async ({ trackIds, bandName, tourName }) => {
  try {
    // Add timeout for large playlists as they'll take longer to process
    const timeout = trackIds.length > 100 ? 60000 : 30000; // 60 seconds for large playlists

    const response = await axios.post(
      `${server_url}/playlist/create_playlist`,
      {
        track_ids: trackIds,
        band: bandName,
        tour: tourName,
      },
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

// File: ./frontend/src/api/index.js
// File: ./frontend/src/api/index.js
export * from './authService';
export * from './setlistService';
export * from './playlistService';
export * from './sseService';
export * from './deezerService';

// Re-export the eventSourceService as default for easy import
import eventSourceService from './sseService';
export default eventSourceService;

// File: ./frontend/src/api/setlistService.js
// File: ./frontend/src/api/setlistService.js
import axios from 'axios';
import { extractSetlistID } from '../utils/setlistHelpers';
import eventSourceService from './sseService';
import { server_url } from "../App";

/**
 * Search for artists by name using Spotify
 * 
 * @param {string} artistName Artist name to search for
 * @returns {Promise<Array>} Promise resolving to array of artist matches
 */
export const searchArtists = async (artistName) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search`,
      { artistName },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data || [];
  } catch (error) {
    console.error("Error searching for artists:", error);
    throw error;
  }
};

/**
 * Search for artists by name using Deezer
 * 
 * @param {string} artistName Artist name to search for
 * @returns {Promise<Array>} Promise resolving to array of artist matches
 */
export const searchArtistsDeezer = async (artistName) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search_deezer`,
      { artistName },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data || [];
  } catch (error) {
    console.error("Error searching for artists with Deezer:", error);
    throw error;
  }
};

/**
 * Fetch tour information for a specific artist with SSE progress updates
 * 
 * @param {Object} artist Artist object with name, id, and url
 * @param {Function} progressCallback Callback function for progress updates
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const fetchArtistTour = async (artist, progressCallback) => {
  try {
    // Connect to SSE if not already connected
    await eventSourceService.connect();
    const clientId = eventSourceService.getClientId();

    if (!clientId) {
      throw new Error("Failed to establish SSE connection");
    }

    // Set up a listener for this specific search operation
    const listenerId = `search-${Date.now()}`;

    // Create a promise that will resolve when we get complete data or reject on error
    const resultPromise = new Promise((resolve, reject) => {
      eventSourceService.addListener(listenerId, (event) => {
        // Pass progress updates to the callback
        if (event.type === 'update' && progressCallback) {
          progressCallback({
            stage: event.stage,
            message: event.message,
            progress: event.progress
          });
        }

        // Handle completion
        if (event.type === 'complete') {
          resolve(event.data);
        }

        // Handle errors
        if (event.type === 'error') {
          reject(new Error(event.message));
        }
      });
    });

    // Initiate the search process
    await axios.post(
      `${server_url}/setlist/search_with_updates`,
      {
        artist: {
          name: artist.name,
          spotifyId: artist.id,
          url: artist.url
        },
        clientId
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    // Wait for the result
    const result = await resultPromise;

    // Clean up the listener
    eventSourceService.removeListener(listenerId);

    return result;
  } catch (error) {
    console.error("Error fetching artist tour:", error);

    // Clean up and transform errors
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred.");
      }
    }

    throw error;
  }
};

/**
 * Legacy function to fetch setlists by setlist ID
 * 
 * @param {string} setlistUrl URL of the setlist to fetch
 * @returns {Promise<Object>} Promise resolving to tour data and spotify songs
 */
export const fetchSetlistById = async (setlistUrl) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist`,
      { listID: extractSetlistID(setlistUrl) },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return {
      spotifyData: response.data.spotifySongsOrdered || [],
      tourData: response.data.tourData || {}
    };
  } catch (error) {
    console.error("Error fetching setlist by ID:", error);

    // Handle specific error cases
    if (error.response) {
      if (error.response.status === 429) {
        throw new Error("Too many requests. Setlist.fm is rate-limiting us. Please try again later.");
      } else {
        throw new Error(error.response.data.error || "An error occurred.");
      }
    }

    throw error;
  }
};

// File: ./frontend/src/api/consentService.js
// File: ./frontend/src/api/consentService.js
import axios from 'axios';
import { server_url } from "../App";

/**
 * Log user consent to server
 * 
 * @param {Object} consentData Data about user consent
 * @param {Date|string} consentData.date Timestamp when consent was given
 * @param {boolean} consentData.agreedToTerms Whether user agreed to terms
 * @param {boolean} consentData.agreedToPrivacy Whether user agreed to privacy policy
 * @returns {Promise<Object>} Promise resolving to response object with consentId
 */
export const logConsent = async (consentData) => {
  try {
    const response = await axios.post(
      `${server_url}/consent/log`,
      { consentData },
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      success: true,
      consentId: response.data.consentId,
      message: response.data.message
    };
  } catch (error) {
    console.error("Error logging consent:", error);

    // Return object indicating to fall back to localStorage only
    return {
      success: false,
      localStorageOnly: true,
      message: error.response?.data?.message || "Failed to log consent to server"
    };
  }
};

/**
 * Verify a consent record exists on the server
 * 
 * @param {string} consentId ID of the consent record to verify
 * @returns {Promise<Object>} Promise resolving to verification result
 */
export const verifyConsent = async (consentId) => {
  try {
    if (!consentId) {
      throw new Error("Missing consent ID");
    }

    const response = await axios.get(
      `${server_url}/consent/verify/${consentId}`,
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      verified: response.data.verified,
      details: response.data.details,
      message: response.data.message
    };
  } catch (error) {
    console.error("Error verifying consent:", error);

    return {
      verified: false,
      message: error.response?.data?.message || "Failed to verify consent"
    };
  }
};

// File: ./frontend/src/api/authService.js
import axios from 'axios';
import { isMobileDevice } from '../utils/deviceDetection';
import { server_url } from "../App";


/**
 * Initiates Spotify login based on device type
 * - For mobile: Saves state to sessionStorage and redirects
 * - For desktop: Opens a popup for authentication
 * 
 * @param {Object} currentState Current app state to save before redirecting
 * @returns {void}
 */
export const initiateSpotifyLogin = (currentState) => {
  if (isMobileDevice()) {
    // Save current state to sessionStorage before redirecting on mobile
    if (currentState) {
      sessionStorage.setItem("concertCramState", JSON.stringify(currentState));
    }

    // Redirect to Spotify login
    window.location.href = `${server_url}/auth/login`;
  } else {
    // Desktop popup approach
    const width = 450;
    const height = 730;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    const url = `${server_url}/auth/login`;

    window.open(
      url,
      "Spotify Login",
      `width=${width},height=${height},top=${top},left=${left}`
    );
  }
};


/**
 * Sets up an authentication listener for the popup window response
 * 
 * @param {Function} callback Function to call with authentication data
 * @returns {Function} Cleanup function to remove the event listener
 */
export const setupAuthListener = (callback) => {
  const handleMessage = (event) => {
    // Modify this to accept messages from any origin during authentication
    // Since we're only checking for a specific message type, this is safer than it appears
    console.log(`Auth message received from: ${event.origin}`);

    // Optional: If you want to be more restrictive
    /* 
    const allowedOrigins = [
      'http://localhost:5173',
      'https://setlistscout.onrender.com',
      'https://setlistscout-server.onrender.com',
      'https://accounts.spotify.com'
    ];
    
    if (!allowedOrigins.includes(event.origin)) {
      console.warn(`Rejected message from unauthorized origin: ${event.origin}`);
      return;
    }
    */

    // Handle auth message format
    if (event.data && event.data.type === "authentication") {
      console.log('Authentication message received:', event.data.type);
      callback({
        isLoggedIn: event.data.isLoggedIn,
        userId: null // Will be fetched from the status endpoint
      });
    }
  };

  window.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage);
  };
};

export const checkSessionStatus = async () => {
  try {
    console.log('Checking session status');
    const response = await axios.get(`${server_url}/auth/status`, {
      withCredentials: true // Important to include cookies
    });

    console.log('Session status response:', response.data);
    return {
      isLoggedIn: response.data.isLoggedIn,
      userId: response.data.userId
    };
  } catch (error) {
    console.error("Error checking session status:", error);
    return { isLoggedIn: false, userId: null };
  }
};

// File: ./frontend/src/api/deezerService.js
// src/api/deezerService.js
import axios from 'axios';
import { server_url } from '../App';

/**
 * Search for artists on Deezer
 * 
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of artist objects
 */
export const searchDeezerArtists = async (query) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search_deezer`,
      { artistName: query },
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (error) {
    console.error("Error searching for artists on Deezer:", error);
    throw error;
  }
};

// File: ./frontend/src/pages/Legal.jsx
// File: ./frontend/src/pages/Legal.jsx
import React, { useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Container,
  VStack,
  Link,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { ExternalLinkIcon } from "@chakra-ui/icons";

/**
 * Combined Legal page component
 * - Displays both End User Agreement and Privacy Policy in tabs
 * - Supports direct linking to specific tab via URL parameter
 */
export default function Legal() {
  const [searchParams] = useSearchParams();
  const tabIndex = parseInt(searchParams.get("tab") || "0");

  return (
    <Container maxW="container.md" mt={8} mb={8}>
      <Heading as="h1" size="xl" color="teal.400" mb={4}>
        Legal Information
      </Heading>
      <Text color="gray.500" mb={6}>
        Effective Date: May 13, 2025
      </Text>

      <Tabs
        variant="enclosed"
        colorScheme="teal"
        isLazy
        defaultIndex={tabIndex}
      >
        <TabList>
          <Tab fontWeight="semibold">Terms of Service</Tab>
          <Tab fontWeight="semibold">Privacy Policy</Tab>
        </TabList>

        <TabPanels>
          {/* TERMS OF SERVICE TAB */}
          <TabPanel>
            <VStack spacing={6} align="start">
              <Heading as="h2" size="lg">
                End User Agreement for Setlist Scout
              </Heading>

              <Divider />

              <Heading as="h2" size="lg">
                Introduction and Acceptance
              </Heading>
              <Text>
                Welcome to Setlist Scout! This End User Agreement ("Agreement")
                is a legally binding contract between you and Setlist Scout
                regarding your use of our service.
              </Text>
              <Text fontWeight="bold">
                By accessing or using Setlist Scout, you agree to be bound by
                this Agreement. If you do not agree to this Agreement, you must
                not access or use our service.
              </Text>
              <Text>
                Setlist Scout is a tool designed to help concert-goers prepare
                for upcoming shows by providing insights into what songs their
                favorite artists are playing on tour.
              </Text>

              <Heading as="h2" size="lg">
                Service Description
              </Heading>
              <Text>Setlist Scout allows you to:</Text>
              <Box pl={4}>
                <Text>• Search for artists and view their recent setlists</Text>
                <Text>
                  • See which songs artists have been playing on tour and their
                  frequency
                </Text>
                <Text>
                  • Create Spotify playlists from these song lists when logged
                  in with Spotify
                </Text>
              </Box>

              <Heading as="h2" size="lg">
                Third-Party Services
              </Heading>
              <Heading as="h3" size="md">
                Spotify Integration
              </Heading>
              <Text>
                Setlist Scout integrates with Spotify's API to provide music
                information and playlist creation capabilities. By using these
                features:
              </Text>
              <Box pl={4}>
                <Text>
                  1. You agree to comply with{" "}
                  <Link
                    href="https://www.spotify.com/us/legal/end-user-agreement/"
                    color="teal.500"
                    isExternal
                  >
                    Spotify's Terms of Use <ExternalLinkIcon mx="2px" />
                  </Link>
                </Text>
                <Text>
                  2. You authorize Setlist Scout to access your Spotify account
                  with the permissions you approve (specifically the
                  "playlist-modify-public" scope, which allows us to create
                  public playlists on your behalf)
                </Text>
                <Text>
                  3. You acknowledge that Spotify is a third-party beneficiary
                  of this Agreement and is entitled to directly enforce this
                  Agreement
                </Text>
                <Text>
                  4. You understand that your use of Spotify features is also
                  governed by Spotify's Privacy Policy
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Setlist.fm Integration
              </Heading>
              <Text>
                We use data from Setlist.fm to provide setlist information. Your
                use of our service is also subject to Setlist.fm's terms.
              </Text>

              <Heading as="h2" size="lg">
                User Accounts and Security
              </Heading>
              <Text>When you connect your Spotify account:</Text>
              <Box pl={4}>
                <Text>
                  • You are responsible for maintaining the confidentiality of
                  your credentials
                </Text>
                <Text>
                  • You agree not to share your login information with others
                </Text>
                <Text>
                  • You must notify us of any unauthorized use of your account
                </Text>
              </Box>

              <Heading as="h2" size="lg">
                Data Usage and Privacy
              </Heading>
              <Text>
                Your use of Setlist Scout is also subject to our Privacy Policy,
                which explains how we collect, use, and protect your personal
                information. By using Setlist Scout, you consent to the data
                practices described in the Privacy Policy.
              </Text>

              <Heading as="h2" size="lg">
                User Conduct
              </Heading>
              <Text>When using Setlist Scout, you agree not to:</Text>
              <Box pl={4}>
                <Text>• Violate any applicable laws or regulations</Text>
                <Text>• Interfere with or disrupt the service or servers</Text>
                <Text>
                  • Attempt to gain unauthorized access to any part of the
                  service
                </Text>
                <Text>
                  • Use the service for any commercial purpose without our
                  consent
                </Text>
                <Text>
                  • Engage in any activity that could harm other users or our
                  service
                </Text>
                <Text>
                  • Modify or create derivative works based on the Spotify
                  Platform, Spotify Service or Spotify Content
                </Text>
                <Text>
                  • Decompile, reverse-engineer, disassemble, or otherwise
                  reduce the Spotify Platform, Spotify Service, and Spotify
                  Content to source code or other human-perceivable form
                </Text>
              </Box>

              <Heading as="h2" size="lg">
                Intellectual Property
              </Heading>
              <Text>
                The content, organization, graphics, design, and other matters
                related to Setlist Scout are protected by applicable copyrights
                and other proprietary rights. We respect the intellectual
                property of others and expect users to do the same.
              </Text>

              <Heading as="h2" size="lg">
                Disclaimer of Warranties
              </Heading>
              <Text fontWeight="bold">
                SETLIST SCOUT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM
                ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </Text>
              <Text mt={2}>
                WITH RESPECT TO THE SPOTIFY PLATFORM, SPOTIFY SERVICE, AND
                SPOTIFY CONTENT, WE MAKE NO WARRANTIES OR REPRESENTATIONS ON
                BEHALF OF SPOTIFY AND EXPRESSLY DISCLAIM ALL IMPLIED WARRANTIES
                WITH RESPECT TO THE SPOTIFY PLATFORM, SPOTIFY SERVICE AND
                SPOTIFY CONTENT, INCLUDING THE IMPLIED WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
                NON-INFRINGEMENT.
              </Text>

              <Heading as="h2" size="lg">
                Responsibility and Limitation of Liability
              </Heading>
              <Text>
                Setlist Scout is solely responsible for its products and
                services. Spotify and any other third-party services integrated
                into Setlist Scout are not responsible for Setlist Scout or its
                operation.
              </Text>
              <Text fontWeight="bold" mt={2}>
                TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL SETLIST
                SCOUT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO
                YOUR USE OF THE SERVICE.
              </Text>
              <Text mt={2}>
                SPOTIFY AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY DAMAGES
                OR LOSSES ARISING FROM YOUR USE OF THE SPOTIFY PLATFORM, SPOTIFY
                SERVICE, OR SPOTIFY CONTENT, OR YOUR USE OF SETLIST SCOUT.
                SPOTIFY PROVIDES THE SPOTIFY PLATFORM, SPOTIFY SERVICE, AND
                SPOTIFY CONTENT "AS IS" WITHOUT ANY WARRANTY OR REPRESENTATION.
              </Text>

              <Heading as="h2" size="lg">
                Termination
              </Heading>
              <Text>
                We may terminate or suspend your access to Setlist Scout at any
                time, without prior notice or liability, for any reason.
              </Text>

              <Heading as="h2" size="lg">
                Changes to this Agreement
              </Heading>
              <Text>
                We may modify this Agreement at any time. If we make material
                changes, we will notify you by email or by posting a notice on
                our website before the changes become effective. Your continued
                use of Setlist Scout after any changes indicates your acceptance
                of the modified Agreement.
              </Text>

              <Heading as="h2" size="lg">
                Governing Law
              </Heading>
              <Text>
                This Agreement shall be governed by the laws of the jurisdiction
                in which Setlist Scout operates, without regard to its conflict
                of law provisions.
              </Text>

              <Heading as="h2" size="lg">
                Contact Information
              </Heading>
              <Text>
                If you have any questions about this Agreement, please contact
                us at: setlistscout@gmail.com
              </Text>

              <Divider />

              <Text fontWeight="bold">
                Spotify is a third-party beneficiary of this End User Agreement
                and is entitled to directly enforce its terms.
              </Text>
            </VStack>
          </TabPanel>

          {/* PRIVACY POLICY TAB */}
          <TabPanel>
            <VStack spacing={6} align="start">
              <Heading as="h2" size="lg">
                Privacy Policy for Setlist Scout
              </Heading>

              <Divider />

              <Heading as="h2" size="lg">
                Introduction
              </Heading>
              <Text>
                Your privacy is important to us. This Privacy Policy explains
                how Setlist Scout ("we", "our", or "us") collects, uses, and
                protects your personal information when you use our website and
                services.
              </Text>
              <Text>
                Setlist Scout is a tool designed to help concert-goers prepare
                for upcoming shows by providing insights into what songs their
                favorite artists are playing on tour.
              </Text>

              <Heading as="h2" size="lg">
                Information We Collect
              </Heading>

              <Heading as="h3" size="md">
                Information You Provide
              </Heading>
              <Text>
                When you use Setlist Scout, we collect the following
                information:
              </Text>
              <Box pl={4}>
                <Text>
                  <strong>Spotify User ID</strong>: Stored temporarily to
                  identify your account when creating playlists
                </Text>
                <Text>
                  <strong>Spotify Access Tokens</strong>: Stored securely to
                  perform authorized actions on your behalf
                </Text>
                <Text>
                  <strong>Session Information</strong>: Stored in encrypted
                  server-side sessions
                </Text>
                <Text>
                  <strong>Spotify API Scopes</strong>: We request only the
                  "playlist-modify-public" scope, which allows us to create
                  public playlists on your behalf
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Information Collected Automatically
              </Heading>
              <Text>
                We also collect certain information automatically when you use
                our service:
              </Text>
              <Box pl={4}>
                <Text>
                  <strong>Usage Data</strong>: Information about how you
                  interact with our service
                </Text>
                <Text>
                  <strong>Device Information</strong>: Browser type, operating
                  system, and device type
                </Text>
                <Text>
                  <strong>IP Address</strong>: Used for service operation and
                  security purposes
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Cookies and Similar Technologies
              </Heading>
              <Text>
                Our service uses a session cookie to maintain your logged-in
                state. This cookie is deleted when you log out or expires after
                24 hours.
              </Text>
              <Text>
                When you authenticate with Spotify, their authentication service
                may place cookies on your browser during the authentication
                process on their domain.
              </Text>

              <Heading as="h2" size="lg">
                How We Use Your Information
              </Heading>
              <Text>We use the information we collect to:</Text>
              <Box pl={4}>
                <Text>• Provide and maintain our service</Text>
                <Text>
                  • Create Spotify playlists based on your artist selections
                </Text>
                <Text>• Maintain your login session</Text>
                <Text>• Improve and personalize your experience</Text>
                <Text>• Ensure the security of our service</Text>
              </Box>

              <Heading as="h2" size="lg">
                Data Sharing and Disclosure
              </Heading>
              <Text>
                We share your information only in the following circumstances:
              </Text>
              <Box pl={4}>
                <Text>
                  <strong>With Spotify</strong>: To authenticate your account
                  and create playlists
                </Text>
                <Text>
                  <strong>Service Providers</strong>: Third-party companies that
                  help us deliver our service (such as hosting providers)
                </Text>
                <Text>
                  <strong>Legal Requirements</strong>: When required by law or
                  to protect our rights
                </Text>
              </Box>

              <Text fontWeight="bold" mt={4}>
                We do NOT:
              </Text>
              <Box pl={4}>
                <Text>• Analyze your listening habits</Text>
                <Text>• Store your search history</Text>
                <Text>• Track your application usage</Text>
                <Text>• Share your data with unauthorized third parties</Text>
              </Box>

              <Heading as="h2" size="lg">
                Data Retention
              </Heading>
              <Text>
                All authentication data is stored in encrypted sessions that
                expire after 24 hours. We do not maintain databases of user
                information or activity. You can delete your session data at any
                time by logging out.
              </Text>
              <Text>
                <strong>Important</strong>: Logging out of Setlist Scout will
                disconnect your Spotify account and remove your data from our
                systems.
              </Text>

              <Heading as="h2" size="lg">
                Your Privacy Rights and Choices
              </Heading>
              <Text>You have the right to:</Text>
              <Box pl={4}>
                <Text>
                  <strong>Access</strong>: Request information about the
                  personal data we have about you
                </Text>
                <Text>
                  <strong>Delete</strong>: Request deletion of your personal
                  data
                </Text>
                <Text>
                  <strong>Disconnect</strong>: Disconnect your Spotify account
                  from our service at any time by logging out
                </Text>
                <Text>
                  <strong>Opt-Out</strong>: Control cookie settings through your
                  browser
                </Text>
              </Box>

              <Text mt={2}>To exercise these rights, you can:</Text>
              <Box pl={4}>
                <Text>
                  • <strong>Log out</strong> from our application using the
                  "Logout" button in the navigation bar (this will disconnect
                  your Spotify account and delete your session data)
                </Text>
                <Text>• Email us at setlistscout@gmail.com</Text>
              </Box>

              <Heading as="h2" size="lg">
                Children's Privacy
              </Heading>
              <Text>
                Our service is not directed to children under the age of 13. We
                do not knowingly collect personal information from children
                under 13. If you are a parent or guardian and believe we have
                collected information from your child, please contact us.
              </Text>

              <Heading as="h2" size="lg">
                Changes to This Privacy Policy
              </Heading>
              <Text>
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Effective Date" at the top.
              </Text>

              <Heading as="h2" size="lg">
                Third-Party Services
              </Heading>

              <Heading as="h3" size="md">
                Spotify
              </Heading>
              <Text>
                When you connect your Spotify account to Setlist Scout:
              </Text>
              <Box pl={4}>
                <Text>
                  • We request only the minimum permissions needed
                  (playlist-modify-public)
                </Text>
                <Text>
                  • Your use of Spotify through our service is also subject to{" "}
                  <Link
                    href="https://www.spotify.com/us/legal/privacy-policy/"
                    color="teal.500"
                    isExternal
                  >
                    Spotify's Privacy Policy <ExternalLinkIcon mx="2px" />
                  </Link>
                </Text>
                <Text>
                  • You will be prompted to authorize specific permissions
                  before we access your Spotify account
                </Text>
              </Box>

              <Heading as="h3" size="md">
                Setlist.fm
              </Heading>
              <Text>
                We use Setlist.fm to retrieve artist setlist information. We do
                not share your personal information with Setlist.fm.
              </Text>

              <Heading as="h2" size="lg">
                User Consent
              </Heading>
              <Text fontWeight="bold">
                By using Setlist Scout, you consent to our collection, use, and
                sharing of your information as described in this Privacy Policy.
                If you do not agree with this policy, please do not use our
                service.
              </Text>

              <Heading as="h2" size="lg">
                Contact Us
              </Heading>
              <Text>
                If you have any questions about this Privacy Policy, please
                contact us at:
              </Text>
              <Box pl={4}>
                <Text>Email: setlistscout@gmail.com</Text>
              </Box>

              <Divider />

              <Text fontWeight="bold">
                Spotify is a third-party beneficiary of this Privacy Policy and
                is entitled to directly enforce its terms.
              </Text>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
}


// File: ./frontend/src/pages/About.jsx
import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Flex,
  Icon,
  Link,
  UnorderedList,
  ListItem,
  Container,
  Button,
} from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";
import { Link as RouterLink } from "react-router-dom";

export default function About() {
  return (
    <Container maxW="container.md" mt={8}>
      <VStack spacing={6} align="start">
        <Heading as="h1" size="xl" color="teal.400">
          About Setlist Scout
        </Heading>

        <Text>
          Setlist Scout is a tool designed to help concert-goers prepare for
          upcoming shows by providing insights into what songs their favorite
          artists are playing on tour.
        </Text>

        <Heading as="h1" size="xl" color="teal.400">
          How It Works:
        </Heading>

        <UnorderedList spacing={2} pl={4}>
          <ListItem>
            Search for your favorite artist using our search bar. Artists will
            be populated by{" "}
            <Link href="https://www.deezer.com/us/" isExternal color="teal.400">
              Deezer API
            </Link>{" "}
            search data. Select an artist...
          </ListItem>
          <ListItem>
            ...and Setlist Scout will look up the artist's recent shows on{" "}
            <Link href="https://www.setlist.fm" isExternal color="teal.400">
              Setlist.fm
            </Link>
            , find the songs they've been playing on tour, and tally them up.
            The songs will be displayed in order of most played, along with
            track and album information from{" "}
            <Link href="https://www.spotify.com" isExternal color="teal.400">
              Spotify.
            </Link>{" "}
          </ListItem>
          <ListItem>
            If you want to, you can also click the LOGIN button to login to{" "}
            <Link href="https://www.spotify.com" isExternal color="teal.400">
              Spotify
            </Link>{" "}
            to create a playlist of these songs to start preparing for the show!
          </ListItem>
        </UnorderedList>

        <Heading as="h1" size="xl" color="teal.400">
          Issues/Contact
        </Heading>

        <Text>
          <p>
            With the vast amount of artists out there and the fact that most{" "}
            <Link href="https://www.setlist.fm" isExternal color="teal.400">
              Setlist.fm
            </Link>{" "}
            concert info is submitted by fans, we often encounter errors or
            idiosyncrasies in the data.
          </p>
          <br></br>
          <p>
            If you're having trouble getting information for a specific artist,
            please email us at{" "}
            <Box as="span" display="inline" whiteSpace="nowrap">
              <Icon as={EmailIcon} mr={2} color="teal.400" />
              <Link href="mailto:setlistscout@gmail.com" color="teal.400">
                setlistscout@gmail.com
              </Link>
            </Box>
            , let us know what's not working, and we'll try to fix it!
          </p>
        </Text>
      </VStack>
    </Container>
  );
}


// File: ./frontend/src/pages/Contact.jsx
// src/pages/Contact.jsx
import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link,
  Flex,
  Icon,
  Container,
} from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";

export default function Contact() {
  return (
    <Container maxW="container.md" mt={8}>
      <VStack spacing={6} align="start">
        <Heading as="h1" size="xl" color="teal.400">
          Contact
        </Heading>

        <Text>
          Have feedback, feature requests, or found a bug? We'd love to hear
          from you!
        </Text>

        <Flex align="center" mt={4}>
          <Icon as={EmailIcon} mr={2} color="teal.400" />
          <Link href="mailto:setlistscout@gmail.com" color="teal.400">
            setlistscout@gmail.com
          </Link>
        </Flex>

        <Text mt={4}>For technical issues, please include details about:</Text>
        <Box pl={4}>
          <Text>• your browser</Text>
          <Text>• what artist you were searching for</Text>
          <Text>• any error messages you received</Text>
        </Box>
      </VStack>
    </Container>
  );
}


// File: ./frontend/src/pages/Home.jsx
// src/pages/Home.jsx
import React from "react";
import { Box, Grid, GridItem, useBreakpointValue } from "@chakra-ui/react";
import UserInput from "../components/UserInput";
import TracksHUD from "../components/TracksHUD";

/**
 * Home page component
 * - Main landing page with artist search and track display
 */
export default function Home() {
  // Responsive column layout
  const columns = useBreakpointValue({
    base: "1fr",
    lg: "minmax(300px, 1fr) minmax(300px, 2fr)", // Changed from md to lg for better mobile layout
  });

  return (
    <Grid templateColumns={columns} gap={6} width="100%" maxWidth="100%">
      <GridItem width="100%">
        <Box
          py={{ base: 4, md: 4 }}
          px={{ base: 4, md: 4 }}
          width="100%"
          mb={{ base: 2, md: 0 }}
        >
          <UserInput />
        </Box>
      </GridItem>
      <GridItem width="100%">
        <Box p={{ base: 2, md: 4 }} width="100%">
          <TracksHUD />
        </Box>
      </GridItem>
    </Grid>
  );
}


// File: ./backend/middleware/authMiddleware.js
/**
 * Middleware to ensure user is authenticated
 * - Checks for valid session with access_token and user_id
 * - Logs detailed authentication state for debugging
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 * @returns {Function} Next middleware or 401 unauthorized response
 */
const ensureAuthenticated = (req, res, next) => {
  console.log('Request cookies:', req.headers.cookie);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Authentication check:', {
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    hasUserId: !!req.session?.user_id,
    userAgent: req.headers['user-agent']
  });

  if (req.session && req.session.access_token && req.session.user_id) {
    return next();
  } else {
    return res.status(401).json({ error: 'User not authenticated' });
  }
};

module.exports = ensureAuthenticated;

// File: ./backend/server.js
// File: ./backend/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Create Redis client with improved connection handling
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 60000, // 60 seconds
    keepAlive: 30000, // Send keep-alive every 30 seconds
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Too many retries on Redis. Giving up.');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000); // increasing delay, capped at 3s
    }
  }
});

// Set up Redis event listeners for connection management
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
  if (err.code === 'ECONNRESET' || err.code === 'CONNECTION_BROKEN') {
    console.log('Connection reset detected - Redis will automatically attempt to reconnect');
  }
});

redisClient.on('reconnecting', () => {
  console.log('Attempting to reconnect to Redis...');
});

redisClient.on('connect', () => {
  console.log('Connected/Reconnected to Redis');
});

// Connect to Redis
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Make Redis client available to route handlers
app.set('redisClient', redisClient);

// Set trust proxy
app.set('trust proxy', 1);

// Middleware Configuration
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
}));
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://setlistscout.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Handle preflight OPTIONS requests for all routes.
app.options('*', cors());

// Initialize RedisStore
const store = new RedisStore({ client: redisClient });

// Session Middleware
app.use(session({
  store: store,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Must be true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Important for cross-site cookies
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
    // No domain setting since frontend and backend are on different domains
  },
}));

// Keep Redis connection alive with periodic pings
const REDIS_PING_INTERVAL = 30000; // 30 seconds
setInterval(async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.ping();
      // Uncomment for debugging:
      // console.log('Redis ping successful');
    }
  } catch (error) {
    console.error('Redis ping failed:', error);
  }
}, REDIS_PING_INTERVAL);

// Route Imports
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const setlistRoutes = require('./routes/setlistRoutes');
const sseRoutes = require('./routes/sseRoutes');
const consentRoutes = require('./routes/consentRoutes'); // Add consent routes

// Mount Routes
app.use('/auth', authRoutes);
app.use('/playlist', playlistRoutes);
app.use('/setlist', setlistRoutes);
app.use('/sse', sseRoutes);
app.use('/consent', consentRoutes); // Mount the consent routes

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// All other routes serve the frontend application
app.get('*', (req, res) => {
  console.log('Serving the frontend application');
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// File: ./backend/utils/setlistAPIRequests.js
const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');
const limiter = new Bottleneck({
  minTime: 600, // minimum time (ms) between requests
  maxConcurrent: 1, // maximum concurrent requests
});

/**
 * Introduces a delay between API calls
 * - Used for rate limiting
 * 
 * @param {number} ms Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A helper function that wraps axios.get with retry logic.
 * If a 429 (Too Many Requests) error is encountered, it will wait (with exponential backoff) and retry.
 *
 * @param {string} url - The URL to request.
 * @param {object} config - The axios configuration object.
 * @param {number} retries - Number of retry attempts (default 3).
 * @param {number} backoff - Initial backoff delay in ms (default 1000).
 */
const axiosGetWithRetry = async (url, config, retries = 3, backoff = 1000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      // Check if the error is a 429 (Too Many Requests)
      if (error.response && error.response.status === 429 && attempt < retries) {
        logger.warn(`429 error received, retrying attempt ${attempt + 1} for URL: ${url}`);
        await delay(backoff);
        backoff *= 2; // Exponential backoff
        continue;
      } else {
        throw error;
      }
    }
  }
};

// Raw functions for the artist page requests.
const getArtistPageByNameRaw = async (artist) => {
  logger.info('Requesting setlist artist page', { artist });
  const encodedArtistName = encodeURIComponent(`"${artist.name}"`);
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodedArtistName}&p=1`; const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received setlist at artist page');
  return response.data;
};

const getArtistPageByMBIDRaw = async (mbid) => {
  logger.info('Requesting setlist artist page by MBID:', { mbid });
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1`;
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received setlist at artist page');
  return response.data;
};

/**
 * Gets artist page by name from Setlist.fm
 * - Rate-limited to avoid API restrictions
 * 
 * @param {Object} artist Artist object with name
 * @returns {Object} Artist page data from Setlist.fm
 * @async
 */
const getArtistPageByName = limiter.wrap(getArtistPageByNameRaw);
/**
 * Gets artist page by MusicBrainz ID from Setlist.fm
 * - Rate-limited to avoid API restrictions
 * 
 * @param {string} mbid MusicBrainz ID
 * @returns {Object} Artist page data from Setlist.fm
 * @async
 */
const getArtistPageByMBID = limiter.wrap(getArtistPageByMBIDRaw);

/**
 * Gets tour name from a setlist
 * 
 * @param {string} listID Setlist ID
 * @returns {Object} Band name and tour name
 * @async
 */
const getTourName = async (listID) => {
  logger.info('Requesting tour name', { listID });
  const url = `https://api.setlist.fm/rest/1.0/setlist/${listID}`;
  const response = await axiosGetWithRetry(url, {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SETLIST_API_KEY,
    },
  });
  logger.info('Received tour name data', { listID, bandName: response.data.artist.name });
  return {
    bandName: response.data.artist.name,
    tourName: response.data.tour?.name,
  };
};

/**
 * Gets all songs played during a tour
 * - Fetches all pages of results
 * - Handles rate limiting and retries
 * 
 * @param {string} artistName Artist name
 * @param {string} tourName Tour name
 * @returns {Array} All tour setlist data
 * @async
 */
const getAllTourSongs = async (artistName, tourName) => {
  logger.info('Starting to fetch all tour songs', { artistName, tourName });
  try {
    // Rate-limit the first page request as well.
    const firstResponse = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=1&tourName=${tourName}`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });
    logger.debug('Received first page of setlist data', { artistName, tourName });

    const firstPage = firstResponse.data;
    const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
    const allData = [firstPage];
    await delay(1000);

    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      logger.debug('Scheduling page request', { page: i });
      const request = limiter.schedule(() => {
        const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${artistName}&p=${i}&tourName=${tourName}`;
        return axiosGetWithRetry(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
          },
        });
      });
      promises.push(request);
    }

    const additionalResponses = await Promise.all(promises);
    additionalResponses.forEach((resp, index) => {
      logger.debug('Received additional page of setlist data', { page: index + 2 });
      allData.push(resp.data);
    });

    return allData;
  } catch (error) {
    logger.error('Error fetching tour songs', {
      artistName,
      tourName,
      error: error.message,
      statusCode: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
    });
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Internal Server Error',
    };
  }
};

/**
 * Gets all songs played during a tour using MusicBrainz ID
 * - Similar to getAllTourSongs but uses MBID for more precise matching
 * 
 * @param {string} artistName Artist name
 * @param {string} mbid MusicBrainz ID
 * @param {string} tourName Tour name
 * @returns {Array} All tour setlist data
 * @async
 */
const getAllTourSongsByMBID = async (artistName, mbid, tourName) => {
  logger.info('Starting to fetch all tour songs by MBID', { artistName, tourName });
  try {
    const firstResponse = await limiter.schedule(() => {
      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=1&tourName=${tourName}`;
      return axiosGetWithRetry(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.SETLIST_API_KEY,
        },
      });
    });
    logger.debug('Received first page of setlist data', { artistName, tourName });

    const firstPage = firstResponse.data;
    const totalPages = Math.ceil(firstPage.total / firstPage.itemsPerPage);
    const allData = [firstPage];
    await delay(1000);

    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      logger.debug('Scheduling page request', { page: i });
      const request = limiter.schedule(() => {
        const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${mbid}&p=${i}&tourName=${tourName}`;
        return axiosGetWithRetry(url, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.SETLIST_API_KEY,
          },
        });
      });
      promises.push(request);
    }

    const additionalResponses = await Promise.all(promises);
    additionalResponses.forEach((resp, index) => {
      logger.debug('Received additional page of setlist data', { page: index + 2 });
      allData.push(resp.data);
    });

    return allData;
  } catch (error) {
    logger.error('Error fetching tour songs', {
      artistName,
      tourName,
      error: error.message,
      statusCode: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
    });
    return {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Internal Server Error',
    };
  }
};

module.exports = { getArtistPageByMBID, getArtistPageByName, getTourName, getAllTourSongs, getAllTourSongsByMBID, delay };


// File: ./backend/utils/musicBrainzChecks.js

/**
 * Checks if artist names match between Spotify and MusicBrainz
 * - Normalizes strings (lowercase, remove diacritics)
 * - Checks for exact match or partial inclusion
 * 
 * @param {string} spotifyName Artist name from Spotify
 * @param {string} mbName Artist name from MusicBrainz
 * @returns {boolean} True if names match, false otherwise
 */
function isArtistNameMatch(spotifyName, mbName) {
  if (!spotifyName || !mbName) return false;
  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizedSpotify = normalize(spotifyName);
  const normalizedMB = normalize(mbName);

  return (
    normalizedSpotify === normalizedMB ||
    normalizedSpotify.includes(normalizedMB) ||
    normalizedMB.includes(normalizedSpotify)
  );
}


module.exports = { isArtistNameMatch };


// File: ./backend/utils/logger.js
const winston = require('winston');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure the logger
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

logger.info(`Logger initialized in ${NODE_ENV} mode`);

module.exports = logger;

// File: ./backend/utils/musicBrainzAPIRequests.js
const axios = require("axios");
const Bottleneck = require("bottleneck");
const logger = require('../utils/logger');

/**
 * Fetches MusicBrainz ID from Spotify URL
 * - Queries the MusicBrainz API with the Spotify artist URL
 * - Used to improve matching with Setlist.fm
 * 
 * @param {string} artistUrl Spotify artist URL
 * @returns {Object} MusicBrainz data including artist ID
 * @async
 */
const fetchMBIdFromSpotifyId = async (artistUrl) => {
  try {
    // Encode the artist URL to ensure it's safe for inclusion in a URL query parameter.
    const encodedUrl = encodeURIComponent(artistUrl);
    const apiUrl = `https://musicbrainz.org/ws/2/url/?query=url:${encodedUrl}&targettype=artist&fmt=json`;

    // Make the GET request to the MusicBrainz API.
    const response = await axios.get(apiUrl, {
      headers: {
        // A user-agent required by MusicBrainz.
        'User-Agent': 'SetListScout/1.0 (setlistscout@gmail.com)',
      },
    });

    console.log('MusicBrainz data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error querying MusicBrainz API:', error);
    throw error;
  }
};



module.exports = { fetchMBIdFromSpotifyId };


// File: ./backend/utils/setlistFormatData.js
const { all } = require("axios");
const { getTourName } = require("./setlistAPIRequests");
const { isArtistNameMatch } = require("./musicBrainzChecks");


module.exports = {

  /**
   * Extracts and formats tour information from artist page
   * - Organizes tours by artist and counts occurrences
   * - Tracks years of tour activity
   * 
   * @param {Object} artistPage Artist page data from Setlist.fm
   * @returns {Object} Formatted tour information by artist
   */
  getTour: (artistPage) => {
    // Validate input.
    if (!artistPage || !Array.isArray(artistPage.setlist)) {
      return {};
    }
    // The result is bject mapping artist names to tours.
    const result = {};
    for (const entry of artistPage.setlist) {
      // 1) Extract the artist name.
      const artistName = entry.artist?.name;
      if (!artistName) {
        continue; // Skip if no artist name.
      }
      // 2) Ensure result has a key for this artist.
      if (!result[artistName]) {
        result[artistName] = {};
      }
      // 3) Extract the tour name, defaulting to "No Tour Info" if none exists.
      const tourName = entry.tour?.name || "No Tour Info";
      // 4) Ensure we have an object for this tour under the given artist.
      if (!result[artistName][tourName]) {
        result[artistName][tourName] = {
          tourName,
          count: 0,
          years: new Set(),
        };
      }
      // 5) Increment the count of shows for this (artist, tour).
      result[artistName][tourName].count++;
      // 6) Extract the year from the eventDate if present.
      if (entry.eventDate) {
        // eventDate is usually in dd-mm-yyyy format.
        const parts = entry.eventDate.split("-");
        if (parts.length === 3) {
          const year = parts[2];
          result[artistName][tourName].years.add(year);
        }
      }
    }
    // 7) Convert each 'years' Set to a sorted array.
    for (const [artistName, toursMap] of Object.entries(result)) {
      for (const [tour, dataObj] of Object.entries(toursMap)) {
        dataObj.years = Array.from(dataObj.years).sort();
      }
    }
    return result;
  },

  /**
   * Chooses the best tour name based on various criteria
   * - Prefers actual tour names over "No Tour Info"
   * - Filters out VIP/soundcheck tours
   * - Selects most recent tour if multiple options
   * 
   * @param {Object} tourInfo Tour information from getTour
   * @param {string} targetArtistName Target artist name for matching
   * @returns {string} Selected tour name
   */
  chooseTour: (tourInfo, targetArtistName) => {
    const artistNames = Object.keys(tourInfo);
    let selectedArtist;
    // If only one artist, select that one.
    if (artistNames.length === 1) {
      selectedArtist = artistNames[0];
    } else {
      // If multiple, use isArtistNameMatch to choose the best match.
      selectedArtist = artistNames.find(name => isArtistNameMatch(targetArtistName, name));
      // Fallback if no match is found.
      if (!selectedArtist) {
        selectedArtist = artistNames[0];
      }
    }
    // Get the tours for the selected artist.
    const tours = tourInfo[selectedArtist];
    let tourNames = Object.keys(tours);
    if (tourNames.length === 0) {
      return ""; // No tour found.
    }
    // If multiple tours exist, prefer actual tour names over the placeholder.
    if (tourNames.length > 1) {
      const actualTours = tourNames.filter(name => name.toLowerCase() !== "no tour info");
      if (actualTours.length > 0) {
        tourNames = actualTours;
      }
    }
    // If there's only one tour option, return it.
    if (tourNames.length === 1) {
      return tours[tourNames[0]].tourName;
    }
    // Filter out tours with exclusion keywords like VIP or sound check.
    const exclusionKeywords = ["vip", "v.i.p.", "sound check", "soundcheck"];
    let filteredTours = tourNames.filter(tourName => {
      const lowerTourName = tourName.toLowerCase();
      return !exclusionKeywords.some(keyword => lowerTourName.includes(keyword));
    });
    // If filtering removes all options, revert to all tours.
    if (filteredTours.length === 0) {
      filteredTours = tourNames;
    }
    // Among the remaining tours, select the one with the most recent year.
    let chosenTourName = filteredTours[0];
    let latestYear = 0;
    for (const tourName of filteredTours) {
      const years = tours[tourName].years;
      // Determine the most recent year; if no year data, treat as 0.
      const recentYear = (years && years.length > 0)
        ? Math.max(...years.map(Number))
        : 0;
      if (recentYear > latestYear) {
        latestYear = recentYear;
        chosenTourName = tourName;
      }
    }
    return tours[chosenTourName].tourName;
  },

  /**
   * Processes and tallies songs from setlists
   * - Counts song occurrences across all shows
   * - Handles covers vs. original songs
   * - Calculates play frequencies
   * 
   * @param {Array} allTourInfo All tour setlist data
   * @returns {Object} Processed song data with counts and order
   */
  getSongTally: (allTourInfo) => {
    const counts = new Map();
    // const totalShows = allTourInfo[0].total;
    let totalShowsWithData = 0
    let emptySetlistCount = 0; // Counter for setlists with no data

    // log Artist
    const mainArtist = allTourInfo[0].setlist[0].artist.name;

    allTourInfo.forEach((dataPage) => {
      // dataPage is a group of 20 shows from a specific artist's tour
      // dataPage.setlist is an array, each item is an individual show
      // "for each show...""
      dataPage.setlist.forEach((element) => {
        // "sets" are different sections of a show ("main," "encore," etc.)
        // element.sets.set is an array of every section
        // so "for each section of the show..."
        // sometimes there are sets w/ no data. Log how mean
        if (!element.sets?.set?.length) {
          emptySetlistCount++;
        } else {
          totalShowsWithData++;
        }
        element.sets.set.forEach((setSection) => {
          setSection.song.forEach((song) => {
            // skips "Tape" songs (songs that are played before the show starts)
            if (song.hasOwnProperty("tape") && song.tape === true) {
              return;
            }
            // parse whether song is a cover or not, change artist info accordingly
            let currentArtist;
            if (song.hasOwnProperty("cover")) {
              currentArtist = song.cover.name;
            } else {
              currentArtist = mainArtist;
            }
            // create a key for the song, formatted as "artist|song" to match w/ its count
            const key = `${currentArtist}|${song.name}`;
            // if song alreadys, exists, increment its count
            if (counts.hasOwnProperty(key)) {
              counts[key].count++;
            } else {
              // else, create a new entry for the song
              counts[key] = {
                count: 1,
                song: song.name,
                artist: currentArtist,
              };
            }
          });
        });
      });
    });
    const countsOrdered = Object.values(counts);
    countsOrdered.sort((a, b) => {
      if (a.count < b.count) {
        return 1;
      } else if (a.count > b.count) {
        return -1;
      }
      return 0;
    });

    // Debug
    // console.log("counts_ordered: ", counts_ordered);
    // console.log("totalshows: ", totalShows);
    // console.log("emptySetlistCount: ", emptySetlistCount);
    // console.log("totalShows w data: ", totalShowsWithData);
    return {
      songsOrdered: countsOrdered,
      totalShowsWithData: totalShowsWithData,
    };;

  },


};


// File: ./backend/utils/spotifyAPIRequests.js
// File: ./backend/utils/spotifyAPIRequests.js (updated with progress tracking)
const axios = require("axios");
const Bottleneck = require('bottleneck');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const limiter = new Bottleneck({
  minTime: 200,         // Minimum time (ms) between requests
  maxConcurrent: 5,     // Maximum number of concurrent requests
});

/**
 * Gets Spotify API access token
 * - Uses client credentials flow
 * 
 * @returns {string} Spotify access token
 * @async
 */
const getAccessToken = async () => {
  logger.info("Requesting Spotify access token");
  try {
    const response = await axios.post("https://accounts.spotify.com/api/token", {
      grant_type: "client_credentials", client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET
    }, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    logger.info("Access token received");
    return response.data.access_token;
  } catch (error) {
    logger.error("Error getting access token", error.message);
    throw error;
  }
}

/**
 * Searches for artists on Spotify
 * - Formats results for frontend display
 * 
 * @param {string} token Spotify access token
 * @param {string} artistName Artist name to search
 * @returns {Array} Matching artist objects
 * @async
 */
const searchArtist = async (token, artistName) => {
  logger.info("Searching for Artist", { artistName });
  const queryParams = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: 10
  });
  const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    logger.info("Artist search successful", { artistName });

    return response.data.artists.items.map((artist) => ({
      name: artist.name,
      id: artist.id,
      url: artist.external_urls.spotify,
      image: artist.images[2] ? artist.images[2] : artist.images[0],
    }));
  } catch (error) {
    logger.error("Error searching artist", { artistName, error: error.message });
    throw error;
  }
}

/**
 * Searches for a specific song on Spotify
 * - Handles special cases like "ultraviolet"/"ultra violet"
 * 
 * @param {string} token Spotify access token
 * @param {string} artistName Artist name
 * @param {string} trackName Track name
 * @returns {Object} Search results from Spotify
 * @async
 */
const searchSong = async (token, artistName, trackName) => {
  const query = `track:${trackName} artist:${artistName}`;
  logger.info("Searching for song", { artistName, trackName });
  try {
    const queryParams = new URLSearchParams({
      q: query,
      type: 'track',
    });
    const url = `https://api.spotify.com/v1/search?${queryParams.toString()}`;
    let response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // If no results, check for specific cases (e.g., "ultraviolet")
    if (!response.data.tracks.items.length) {
      // Check if the track name contains "ultraviolet" (without space)
      if (trackName.toLowerCase().includes("ultraviolet") && !trackName.toLowerCase().includes("ultra violet")) {
        const modifiedTrackName = trackName.replace(/ultraviolet/i, "ultra violet");
        logger.info("No results found. Retrying search with modified track name", {
          original: trackName,
          modified: modifiedTrackName,
        });
        const modifiedQuery = `track:${modifiedTrackName} artist:${artistName}`;
        const modifiedQueryParams = new URLSearchParams({
          q: modifiedQuery,
          type: 'track',
        });
        const modifiedUrl = `https://api.spotify.com/v1/search?${modifiedQueryParams.toString()}`;
        response = await axios.get(modifiedUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }
    logger.info("Song search successful", { artistName, trackName });
    return response.data;
  } catch (error) {
    logger.error("Error searching song", { query, error: error.message });
    throw error;
  }
};

// Rate limit the searchSong function to avoid hitting Spotify API limits
const limitedSearchSong = limiter.wrap(searchSong);

/**
 * Gets Spotify information for a list of songs with progress updates
 * - Looks up each song on Spotify
 * - Formats and combines with original song data
 * - Provides progress updates via callback
 * 
 * @param {Array} songList List of songs to look up
 * @param {Function} progressCallback Optional callback for progress updates
 * @returns {Array} Songs with Spotify data
 * @async
 */
const getSpotifySongInfo = async (songList, progressCallback = null) => {
  logger.info("Compiling Spotify song information");
  try {
    const token = await getAccessToken();

    // Initial progress update - starting song search
    if (progressCallback) {
      progressCallback({
        stage: 'spotify_search',
        message: 'Starting Spotify song lookup...',
        progress: 85
      });
    }

    const totalSongs = songList.length;
    const batchSize = 5; // Process songs in batches for better progress reporting
    const batches = Math.ceil(totalSongs / batchSize);
    const spotifyDataParsed = [];

    // Process songs in batches with progress updates
    for (let i = 0; i < batches; i++) {
      // Calculate start and end indices for current batch
      const start = i * batchSize;
      const end = Math.min(start + batchSize, totalSongs);
      const currentBatch = songList.slice(start, end);

      // Update progress
      if (progressCallback) {
        const progress = 85 + ((i / batches) * 15); // Scale from 85% to 100%
        const songsProcessed = Math.min((i + 1) * batchSize, totalSongs);
        progressCallback({
          stage: 'spotify_search',
          message: `Looking up songs on Spotify (${songsProcessed}/${totalSongs})...`,
          progress
        });
      }

      // Process this batch
      const promises = currentBatch.map((song) => {
        return limitedSearchSong(token, song.artist, song.song);
      });

      const batchResponses = await Promise.all(promises);

      // Process responses
      batchResponses.forEach((data, idx) => {
        const songIndex = start + idx;
        const obj = {
          songName: data.tracks.items[0]?.name,
          artistName: data.tracks.items[0]?.artists[0]?.name,
          image: data.tracks.items[0]?.album?.images?.find((img) => img.height === 64),
          imageMed: data.tracks.items[0]?.album?.images?.find((img) => img.height === 300),
          albumName: data.tracks.items[0]?.album?.name,
          albumReleaseDate: data.tracks.items[0]?.album?.release_date,
          uri: data.tracks.items[0]?.uri,
          id: uuidv4(),
        };
        spotifyDataParsed.push({ ...obj, ...songList[songIndex] });
      });
    }

    // Final progress update
    if (progressCallback) {
      progressCallback({
        stage: 'spotify_search',
        message: 'All songs processed!',
        progress: 100
      });
    }

    logger.info("All songs retrieved from Spotify");
    return spotifyDataParsed;
  } catch (error) {
    logger.error("Error getting Spotify song info", error.message);
    throw error;
  }
}

module.exports = { searchArtist, getSpotifySongInfo, getAccessToken }

// File: ./backend/utils/sseManager.js
// File: ./backend/utils/sseManager.js
const logger = require('./logger');

/**
 * Simple SSE (Server-Sent Events) Manager
 * Manages client connections and message distribution
 */
class SSEManager {
  constructor() {
    this.clients = new Map();
    this.clientIdCounter = 0;
    logger.info('SSE Manager initialized');
  }

  /**
   * Register a new client connection
   * @param {Object} res - Express response object
   * @returns {string} Client ID
   */
  addClient(res) {
    const clientId = (++this.clientIdCounter).toString();

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to server events', clientId })}\n\n`);

    // Store the response object
    this.clients.set(clientId, res);

    logger.info(`Client connected: ${clientId}`);
    return clientId;
  }

  /**
   * Remove a client connection
   * @param {string} clientId - ID of client to remove
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      logger.info(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Send an update message to a specific client
   * @param {string} clientId - ID of client to send to
   * @param {string} stage - Current processing stage
   * @param {string} message - Status message
   * @param {number} [progress] - Optional progress percentage (0-100)
   * @param {Object} [data] - Optional additional data
   */
  sendUpdate(clientId, stage, message, progress = null, data = null) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to send update to non-existent client: ${clientId}`);
      return;
    }

    const event = {
      type: 'update',
      stage,
      message,
      timestamp: new Date().toISOString()
    };

    if (progress !== null) {
      event.progress = progress;
    }

    if (data !== null) {
      event.data = data;
    }

    const res = this.clients.get(clientId);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    logger.debug(`Update sent to client ${clientId}: ${message}`);
  }

  /**
   * Send a completion message and close the connection
   * @param {string} clientId - ID of client to complete
   * @param {Object} finalData - Final data to send with completion
   */
  completeProcess(clientId, finalData = {}) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to complete process for non-existent client: ${clientId}`);
      return;
    }

    const res = this.clients.get(clientId);
    const event = {
      type: 'complete',
      message: 'Process completed',
      timestamp: new Date().toISOString(),
      data: finalData
    };

    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
    this.removeClient(clientId);
    logger.info(`Process completed for client: ${clientId}`);
  }

  /**
   * Send an error message and close the connection
   * @param {string} clientId - ID of client to send error to
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  sendError(clientId, message, statusCode = 500) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to send error to non-existent client: ${clientId}`);
      return;
    }

    const res = this.clients.get(clientId);
    const event = {
      type: 'error',
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
    this.removeClient(clientId);
    logger.error(`Error sent to client ${clientId}: ${message}`);
  }
}

// Create singleton instance
const sseManager = new SSEManager();
module.exports = sseManager;

// File: ./backend/routes/playlistRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const ensureAuthenticated = require('../middleware/authMiddleware');

/**
 * Processes tracks in batches for large playlists
 * - Spotify limits adding tracks to 100 per request
 * 
 * @param {string} playlistId Spotify playlist ID
 * @param {string} accessToken Spotify access token
 * @param {Array<string>} trackIds Array of track URIs
 * @returns {Promise<boolean>} Success status
 * @async
 */
async function addTracksInBatches(playlistId, accessToken, trackIds) {
  try {
    // Process tracks in batches of 100 (Spotify API limit)
    const batchSize = 100;
    const batches = [];

    // Split tracks into batches of 100
    for (let i = 0; i < trackIds.length; i += batchSize) {
      batches.push(trackIds.slice(i, i + batchSize));
    }

    console.log(`Adding ${trackIds.length} tracks in ${batches.length} batches of up to ${batchSize} tracks each`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1} of ${batches.length} (${batch.length} tracks)`);

      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: batch,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Add a small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding tracks in batches:', error.response ? error.response.data : error);
    throw error;
  }
}

/**
 * Endpoint: POST /create_playlist
 * Creates a Spotify playlist with selected tracks
 * - Handles large track lists using batch processing
 * - Creates playlist with tour-specific name
 * - Adds tracks to the playlist in batches of 100
 * 
 * @param {Array<string>} req.body.track_ids Spotify track URIs
 * @param {string} req.body.band Band name
 * @param {string} req.body.tour Tour name
 * @returns {Object} Success message and playlist ID
 */
router.post('/create_playlist', ensureAuthenticated, async (req, res) => {
  try {
    // Get access token and user ID from session
    const access_token = req.session.access_token;
    const user_id = req.session.user_id;
    const track_ids = req.body.track_ids;
    const band = req.body.band;
    const tour = req.body.tour;

    console.log(`Creating playlist with ${track_ids.length} tracks`);

    // Create a new playlist
    const createPlaylistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${user_id}/playlists`,
      {
        name: `${band} - ${tour} songs`,
        description: 'Created by SetlistScout',
        public: true,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const playlist_id = createPlaylistResponse.data.id;
    const playlist_url = createPlaylistResponse.data.external_urls.spotify;

    // Add tracks to the playlist in batches
    await addTracksInBatches(playlist_id, access_token, track_ids);

    res.status(200).json({
      message: 'Playlist created successfully',
      playlist_id: playlist_id,
      playlist_url: playlist_url
    });
  } catch (error) {
    console.error('Error creating playlist:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

module.exports = router;

// File: ./backend/routes/consentRoutes.js
// File: ./backend/routes/consentRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Endpoint: POST /log
 * Logs user consent to terms and privacy policy
 * 
 * @param {Object} req.body.consentData Consent data including timestamp
 * @returns {Object} Success message and consent ID
 */
router.post('/log', async (req, res) => {
  try {
    const { consentData } = req.body;

    if (!consentData || !consentData.date) {
      return res.status(400).json({ error: 'Invalid consent data' });
    }

    // Generate a unique ID for this consent record
    const consentId = uuidv4();

    // Add IP address and user agent for additional verification
    // Note: IP is stored for legitimate purposes (proof of consent)
    const consentRecord = {
      id: consentId,
      date: consentData.date,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      agreedToTerms: !!consentData.agreedToTerms,
      agreedToPrivacy: !!consentData.agreedToPrivacy,
      termsVersion: process.env.TERMS_VERSION || '1.0',
      privacyVersion: process.env.PRIVACY_VERSION || '1.0'
    };

    // Store in Redis with 2-year expiration (typical statute of limitations)
    // Key format: consent:{consentId}
    const redisKey = `consent:${consentId}`;

    // Use Redis client from req.app.get('redisClient')
    const redisClient = req.app.get('redisClient');

    if (!redisClient || !redisClient.isOpen) {
      logger.error('Redis client unavailable');
      return res.status(500).json({
        error: 'Database connection issue',
        localStorageOnly: true
      });
    }

    // Store consent record in Redis with 2-year expiration (in seconds)
    const TWO_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 2;
    await redisClient.set(redisKey, JSON.stringify(consentRecord));
    await redisClient.expire(redisKey, TWO_YEARS_IN_SECONDS);

    logger.info(`Consent logged: ${consentId}`);

    // Return success with the consent ID
    res.status(200).json({
      success: true,
      message: 'Consent logged successfully',
      consentId
    });
  } catch (error) {
    logger.error('Error logging consent:', error);
    res.status(500).json({
      error: 'Failed to log consent',
      localStorageOnly: true
    });
  }
});

/**
 * Endpoint: GET /verify/:consentId
 * Verifies if a consent record exists
 * 
 * @param {string} req.params.consentId Consent ID to verify
 * @returns {Object} Consent verification status
 */
router.get('/verify/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;

    if (!consentId) {
      return res.status(400).json({ error: 'Consent ID required' });
    }

    const redisClient = req.app.get('redisClient');

    if (!redisClient || !redisClient.isOpen) {
      logger.error('Redis client unavailable');
      return res.status(500).json({ error: 'Database connection issue' });
    }

    const redisKey = `consent:${consentId}`;
    const consentRecord = await redisClient.get(redisKey);

    if (!consentRecord) {
      return res.status(404).json({
        verified: false,
        message: 'No consent record found'
      });
    }

    res.status(200).json({
      verified: true,
      message: 'Consent record verified',
      details: JSON.parse(consentRecord)
    });
  } catch (error) {
    logger.error('Error verifying consent:', error);
    res.status(500).json({ error: 'Failed to verify consent' });
  }
});

module.exports = router;

// File: ./backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const qs = require('qs');
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

/**
 * Generates a random string for state parameter
 * Used to prevent CSRF attacks in OAuth flow
 * 
 * @param {number} length Length of the random string
 * @returns {string} Random hexadecimal string
 */
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};



/**
 * Endpoint: GET /login
 * Initiates Spotify OAuth flow
 * - Generates state parameter and stores in session
 * - Redirects to Spotify authorization URL
 */
router.get('/login', (req, res) => {
  const state = generateRandomString(16);
  console.log('login state:', state);
  const scope = 'playlist-modify-public';
  // Store state in session for verification
  req.session.state = state;

  console.log("STRINGIFY:====");
  console.log(querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    show_dialog: true
  }));

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

/**
 * Endpoint: GET /callback
 * Handles Spotify OAuth callback
 * - Verifies state to prevent CSRF
 * - Exchanges authorization code for access token
 * - Fetches user information
 * - Handles different flows for mobile vs desktop
 */
router.get('/callback', async (req, res) => {
  try {
    console.log('Host header:', req.headers.host);
    console.log('Origin header:', req.headers.origin);
    console.log('Referer header:', req.headers.referer);
    const code = req.query.code || null;
    const state = req.query.state || null;
    console.log('code:', code);
    console.log('callback state:', state);
    const storedState = req.session.state || null;
    console.log("storedState: ", storedState);
    console.log("state: ", state);

    if (state === null || state !== storedState) {
      console.log('State mismatch error');
      return res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    }

    // Clear state
    req.session.state = null;
    const data = qs.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    console.log('Requesting token from Spotify');
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers: headers });

    if (tokenResponse.status === 200) {
      const access_token = tokenResponse.data.access_token;
      const refresh_token = tokenResponse.data.refresh_token;

      // Get user information
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const user_id = userResponse.data.id;
      console.log('User ID:', user_id);

      // Store tokens in session (secure server-side storage)
      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;
      req.session.user_id = user_id;

      // Save the session explicitly to ensure it's stored before redirect
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
        }

        const frontEndURL = process.env.NODE_ENV === 'production'
          ? 'https://setlistscout.onrender.com'
          : 'http://localhost:5173';

        // Detect if user is on mobile
        const userAgent = req.headers['user-agent'];
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        if (isMobile) {
          // For mobile, redirect with loginStatus=success in fragment
          // But don't include actual tokens for security
          console.log('Mobile detected, redirecting with success status');
          res.redirect(`${frontEndURL}/#loginStatus=success`);
        } else {
          // For desktop, use the popup message approach
          console.log('Desktop detected, sending message via postMessage');
          res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  // For cross-domain communication, the targetOrigin should ideally be specific
  // We're using '*' since this is just sending auth status, not tokens
  const targetOrigin = '*';
  console.log('Sending authentication success message');
  
  try {
    window.opener.postMessage({
      type: 'authentication',
      isLoggedIn: true
    }, targetOrigin);
    console.log('Authentication message sent');
  } catch (err) {
    console.error('Error sending auth message:', err);
  }
  
  // Close the popup after a short delay
  setTimeout(() => {
    window.close();
  }, 300);
</script>
</body>
</html>`);
        }
      });
    } else {
      res.redirect('/error?error=invalid_token');
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.redirect('/error?error=exception');
  }
});

/**
 * Endpoint: POST /refresh
 * Refreshes an expired access token using the refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }

    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

    if (tokenResponse.status === 200) {
      // Sometimes Spotify doesn't return a new refresh token
      const new_access_token = tokenResponse.data.access_token;
      const new_refresh_token = tokenResponse.data.refresh_token || refresh_token;

      // Update session if it exists
      if (req.session) {
        req.session.access_token = new_access_token;
        req.session.refresh_token = new_refresh_token;
      }

      return res.json({
        access_token: new_access_token,
        refresh_token: new_refresh_token
      });
    } else {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', (req, res) => {
  console.log('Request cookies:', req.headers.cookie);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Authentication check:', {
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    hasUserId: !!req.session?.user_id,
    userAgent: req.headers['user-agent']
  });

  const isLoggedIn = !!(req.session && req.session.access_token && req.session.user_id);

  res.json({
    isLoggedIn,
    userId: isLoggedIn ? req.session.user_id : null
  });
});
router.get('/debug-session', (req, res) => {
  res.json({
    sessionId: req.sessionID,
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    cookies: req.headers.cookie
  });
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to log out' });
      }

      res.clearCookie('connect.sid'); // Clear the session cookie
      return res.json({ success: true });
    });
  } else {
    return res.json({ success: true });
  }
});
module.exports = router;

// File: ./backend/routes/setlistRoutes.js
// File: ./backend/routes/setlistRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const {
  getTourName,
  getAllTourSongs, getArtistPageByName, getArtistPageByMBID, delay,
  getAllTourSongsByMBID
} = require("../utils/setlistAPIRequests.js");
const { getSongTally, getTour, chooseTour } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo, getAccessToken, searchArtist } = require("../utils/spotifyAPIRequests.js");
const { fetchMBIdFromSpotifyId } = require("../utils/musicBrainzAPIRequests.js");
const { isArtistNameMatch } = require("../utils/musicBrainzChecks.js");
const sseManager = require('../utils/sseManager');

// New function to search artists using Deezer API
const searchArtistDeezer = async (artistName) => {
  try {
    console.log("Searching for Artist on Deezer", { artistName });

    // Use Deezer API to search for artists
    const response = await axios.get(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=10`
    );

    console.log("Deezer artist search successful", { artistName });

    // Transform Deezer data to match our expected format
    return response.data.data.map((artist) => ({
      name: artist.name,
      id: artist.id,
      url: artist.link,
      image: { url: artist.picture_medium },
    }));
  } catch (error) {
    console.error("Error searching artist on Deezer", { artistName, error: error.message });
    throw error;
  }
};

/**
 * Endpoint: POST /search_with_updates
 * Streamed version of setlist search that sends progress updates
 * 
 * @param {Object} req.body.artist - Artist information object
 * @param {string} req.body.clientId - SSE client ID for sending updates
 * @returns {Object} Tour data and Spotify song information
 */
router.post('/search_with_updates', async (req, res) => {
  const { artist, clientId } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId parameter' });
  }

  try {
    // Start processing and send updates via SSE instead of waiting for completion
    processArtistWithUpdates(artist, clientId);

    // Immediately return success to the client
    return res.status(202).json({
      message: 'Request accepted, processing started',
      clientId
    });
  } catch (error) {
    console.error('Error setting up processing:', error);
    return res.status(500).json({ error: 'Failed to start processing' });
  }
});

/**
 * Process artist data with real-time updates via SSE
 * 
 * @param {Object} artist - Artist information
 * @param {string} clientId - SSE client ID
 */
async function processArtistWithUpdates(artist, clientId) {
  try {
    sseManager.sendUpdate(clientId, 'start', `Starting search for ${artist.name}`, 5);

    // Step 1: Fetch MusicBrainz ID
    sseManager.sendUpdate(clientId, 'musicbrainz', 'Contacting MusicBrainz for artist identification', 15);
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    // Step 2: Get artist page from Setlist.fm
    let artistPage;
    let matched = false;

    if (isArtistNameMatch(artist.name, mbArtistName)) {
      sseManager.sendUpdate(clientId, 'setlist_search', `Found exact match for ${artist.name} on MusicBrainz, getting setlist data`, 30);
      matched = true;
      artistPage = await getArtistPageByMBID(mbid);
    } else {
      sseManager.sendUpdate(clientId, 'setlist_search', `Searching Setlist.fm for ${artist.name}`, 30);
      artistPage = await getArtistPageByName(artist);
    }

    // Step 3: Process tour information
    sseManager.sendUpdate(clientId, 'tour_processing', 'Processing tour information', 45);
    const tourInfo = getTour(artistPage);
    const tourName = chooseTour(tourInfo, artist.name);

    if (!tourName) {
      sseManager.sendError(clientId, "This artist doesn't have any setlist information", 404);
      return;
    }

    // Step 4: Get all tour data
    await delay(600);
    let allTourInfo = [];

    if (tourName === "No Tour Info") {
      sseManager.sendUpdate(clientId, 'setlist_fetch', 'No specific tour found, using recent performances', 55);
      allTourInfo.push(artistPage);
    } else if (matched) {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Fetching setlists for "${tourName}" tour`, 55);
      allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
    } else {
      sseManager.sendUpdate(clientId, 'setlist_fetch', `Fetching setlists for "${tourName}" tour`, 55);
      allTourInfo = await getAllTourSongs(artist.name, tourName);
    }

    // Handle errors in tour info
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      if (allTourInfo && allTourInfo.statusCode) {
        sseManager.sendError(clientId, allTourInfo.message, allTourInfo.statusCode);
      } else {
        sseManager.sendError(clientId, "Server is busy. Please try again.", 400);
      }
      return;
    }

    // Step 5: Process songs from setlists
    sseManager.sendUpdate(clientId, 'song_processing', 'Analyzing setlists and counting song frequencies', 70);
    const tourInfoOrdered = getSongTally(allTourInfo);

    // Step 6: Get Spotify data for songs
    // Instead of a single update, pass the SSE manager's sendUpdate function to track progress
    const progressCallback = (progressData) => {
      sseManager.sendUpdate(
        clientId,
        progressData.stage,
        progressData.message,
        progressData.progress
      );
    };

    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered, progressCallback);

    // Final step: Return complete data
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };

    sseManager.completeProcess(clientId, { tourData, spotifySongsOrdered });

  } catch (error) {
    console.error('Error in processArtistWithUpdates:', error);

    // Handle specific error types
    if (error.response && error.response.status === 504) {
      sseManager.sendError(clientId, "Setlist.fm service is currently unavailable. Please try again later.", 504);
    } else if (error.response) {
      sseManager.sendError(clientId, error.response.data.error || "An error occurred while fetching setlists.", error.response.status);
    } else {
      sseManager.sendError(clientId, "Internal Server Error. Please try again later.", 500);
    }
  }
}

/**
 * Endpoint: POST /
 * Main endpoint to fetch setlist and tour information
 * 
 * @param {Object} req.body.artist Artist information object
 * @returns {Object} Tour data and Spotify song information
 */
router.post('/', async (req, res) => {
  const { artist } = req.body;
  try {
    const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
    const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
    const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;

    let artistPage;
    let matched = false;
    if (isArtistNameMatch(artist.name, mbArtistName)) {
      console.log("MBID matches Spotify ID!")
      matched = true;
      artistPage = await getArtistPageByMBID(mbid);
    } else {
      console.log("MBID match failed, searching Setlist by name")
      artistPage = await getArtistPageByName(artist);
    }

    const tourInfo = getTour(artistPage);
    const tourName = chooseTour(tourInfo, artist.name);

    if (!tourName) {
      return res.status(400).json({ error: "This Setlist does not have tour information" });
    }
    console.log("tourInfo: ", tourInfo);

    await delay(600);
    let allTourInfo = [];
    if (tourName === "No Tour Info") {
      allTourInfo.push(artistPage);
    }
    else if (matched) {
      allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
    } else {
      allTourInfo = await getAllTourSongs(artist.name, tourName);
    }

    // If function returned an error, handle it:
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      if (allTourInfo && allTourInfo.statusCode) {
        return res
          .status(allTourInfo.statusCode)
          .json({ error: allTourInfo.message });
      }
      // Otherwise, default to 400.
      return res
        .status(400)
        .json({ error: "Server is busy. Please try again." });
    }

    // Compile an ordered list of songs from the tour info.
    const tourInfoOrdered = getSongTally(allTourInfo);
    const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered);
    const tourData = {
      bandName: artist.name,
      tourName: tourName,
      totalShows: tourInfoOrdered.totalShowsWithData,
    };

    res.json({ tourData, spotifySongsOrdered });
  } catch (error) {
    console.error('Error in /setlist route:', error);

    // Handle 504 Gateway Timeout specifically.
    if (error.response && error.response.status === 504) {
      return res.status(504).json({
        error: "Setlist.fm service is currently unavailable. Please try again later."
      });
    }
    // Handle other specific error statuses if needed
    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data.error || "An error occurred while fetching setlists." });
    }

    // Fallback for other errors
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

/**
 * Endpoint: POST /artist_search
 * Searches for artists on Spotify
 * 
 * @param {string} req.body.artistName Artist name to search
 * @returns {Array} Matching artist objects from Spotify
 */
router.post('/artist_search', async (req, res) => {
  try {
    const token = await getAccessToken();
    const search_query = req.body.artistName;
    const searchResults = await searchArtist(token, search_query);
    res.json(searchResults);
  } catch (error) {
    console.error('Error in /artist_search route:', error);
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

/**
 * Endpoint: POST /artist_search_deezer
 * Searches for artists on Deezer
 * 
 * @param {string} req.body.artistName Artist name to search
 * @returns {Array} Matching artist objects from Deezer
 */
router.post('/artist_search_deezer', async (req, res) => {
  try {
    const search_query = req.body.artistName;
    const searchResults = await searchArtistDeezer(search_query);
    res.json(searchResults);
  } catch (error) {
    console.error('Error in /artist_search_deezer route:', error);
    res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

module.exports = router;

// File: ./backend/routes/sseRoutes.js
// File: ./backend/routes/sseRoutes.js
const express = require('express');
const sseRouter = express.Router();
const sseManager = require('../utils/sseManager');

/**
 * Endpoint: GET /connect
 * Establishes an SSE connection with the client
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
sseRouter.get('/connect', (req, res) => {
  const clientId = sseManager.addClient(res);

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeClient(clientId);
  });
});

module.exports = sseRouter;


