import React, { useState } from "react";
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
} from "@chakra-ui/react";
import { ExternalLinkIcon, EmailIcon } from "@chakra-ui/icons";
import Track from "./Track";
import AlertMessage from "./AlertMessage";
import ProgressIndicator from "./ProgressIndicator";
import { useAuth } from "../hooks/useAuth";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import { getFromLocalStorage } from "../utils/storage";
import { fetchIndividualShow } from "../api/setlistService";
import { createPlaylist as createPlaylistAPI } from "../api/playlistService";
import spotifyLogo from "../assets/Spotify_Full_Logo_RGB_Green.png";

export default function TracksHUD() {
  const { isLoggedIn, login, logout } = useAuth();
  const { createPlaylist, playlistUrl, clearPlaylistUrl, isCreatingPlaylist } =
    useSpotify();
  const {
    spotifyData,
    tourData,
    showsList,
    selectedShowId,
    setSelectedShow,
    getSpotifyTrack,
    loading,
    playlistNotification,
    setNotification,
    progress,
  } = useSetlist();

  // Tab state for switching between "All Songs" and "Pick a Show"
  const [tabIndex, setTabIndex] = useState(0);

  // State for individual show data
  const [showData, setShowData] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [showError, setShowError] = useState(null);

  // State for show playlist creation (separate from tour playlist)
  const [showPlaylistUrl, setShowPlaylistUrl] = useState(null);
  const [isCreatingShowPlaylist, setIsCreatingShowPlaylist] = useState(false);

  // Determine if we should show the tracks section
  const shouldShowTracks = spotifyData?.length > 0 && !loading;

  // Check if we have shows available for "Pick a Show" feature
  const hasShows = showsList && showsList.length > 0;

  /**
   * Format date from DD-MM-YYYY to readable format
   * @param {string} dateStr Date in DD-MM-YYYY format
   * @returns {string} Formatted date like "Sep 26, 2024"
   */
  const formatShowDate = (dateStr) => {
    if (!dateStr) return "Unknown Date";

    try {
      const [day, month, year] = dateStr.split("-");
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateStr; // Return original if parsing fails
    }
  };

  /**
   * Format show display text for dropdown
   * @param {Object} show Show object with date, venue, city, country
   * @returns {string} Formatted display like "Sep 26, 2024 - Madison Square Garden, New York, US"
   */
  const formatShowDisplay = (show) => {
    const date = formatShowDate(show.date);
    const venue = show.venue || "Unknown Venue";
    const city = show.city || "Unknown City";
    const country = show.country || "Unknown Country";

    return `${date} - ${venue}, ${city}, ${country}`;
  };

  /**
   * Get sorted shows list (newest first)
   * @returns {Array} Sorted shows array
   */
  const sortedShows = React.useMemo(() => {
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
   * Handle show selection from dropdown
   * @param {Event} event Select change event
   */
  const handleShowSelection = (event) => {
    const showId = event.target.value;
    setSelectedShow(showId || null);
  };

  /**
   * Create a playlist specifically for the selected show
   * Uses show-specific naming and track order
   */
  const handleCreateShowPlaylist = async () => {
    if (!showData || !showTracks.length) return;

    // Filter tracks to only include those with Spotify URIs (exclude songs not found on Spotify)
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

    // Set creating playlist state to true
    setIsCreatingShowPlaylist(true);

    try {
      // Extract track URIs for playlist creation
      const trackIds = tracksWithSpotify.map((track) => track.uri);

      // Format date for playlist name: MM/DD/YYYY format as requested
      const formatDateForPlaylist = (dateStr) => {
        if (!dateStr) return "Unknown Date";
        try {
          const [day, month, year] = dateStr.split("-");
          return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
        } catch (error) {
          return dateStr;
        }
      };

      // Generate show-specific playlist name: "Artist: Date (MM/DD/YYYY format) - Venue Name"
      const playlistName = `${
        showData.showInfo?.artist || tourData.bandName
      }: ${formatDateForPlaylist(showData.showInfo?.date)} - ${
        showData.showInfo?.venue || "Unknown Venue"
      }`;

      // Create the playlist using the playlist service directly
      const result = await createPlaylistAPI({
        trackIds,
        bandName: showData.showInfo?.artist || tourData.bandName,
        tourName: "Show Playlist", // Fallback tour name for show playlists
        customName: playlistName,
      });

      if (result.success) {
        // Store the playlist URL if it was returned
        if (result.playlistUrl) {
          setShowPlaylistUrl(result.playlistUrl);
        }

        setNotification({
          message: result.message,
          status: "success",
        });
      } else {
        // Handle auth errors by logging out
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
      // Always set creating playlist state to false when done
      setIsCreatingShowPlaylist(false);
    }
  };

  /**
   * Process show songs with Spotify data from track map
   * @param {Array} showSongs Array of songs from individual show
   * @returns {Array} Array of songs with Spotify data
   */
  const processShowTracks = React.useCallback(
    (showSongs) => {
      if (!showSongs || !Array.isArray(showSongs)) return [];

      return showSongs.map((song, index) => {
        const spotifyTrack = getSpotifyTrack(song.name, song.artist);

        if (spotifyTrack) {
          // Return track with original show order
          return {
            ...spotifyTrack,
            showOrder: index + 1, // Track position in show
            isCover: song.isCover,
          };
        } else {
          // Create placeholder for songs not found on Spotify
          return {
            id: `show-${index}`,
            song: song.name,
            artist: song.artist,
            count: 1, // Always played once in this show
            showOrder: index + 1,
            isCover: song.isCover,
            spotifyError: true,
          };
        }
      });
    },
    [getSpotifyTrack]
  );

  // Reset tab to "All Tour Songs" when new data loads
  React.useEffect(() => {
    if (spotifyData?.length > 0) {
      setTabIndex(0);
    }
  }, [spotifyData]);

  // Reset selected show when switching to tab 2
  React.useEffect(() => {
    if (tabIndex === 1) {
      setSelectedShow(null);
    }
  }, [tabIndex, setSelectedShow]);

  // Fetch individual show data when a show is selected
  React.useEffect(() => {
    if (!selectedShowId) {
      setShowData(null);
      setShowError(null);
      setShowPlaylistUrl(null); // Clear previous show playlist URL
      return;
    }

    // Clear previous show playlist URL when selecting a new show
    setShowPlaylistUrl(null);

    const fetchShow = async () => {
      setShowLoading(true);
      setShowError(null);

      try {
        const data = await fetchIndividualShow(selectedShowId);
        setShowData(data);
      } catch (error) {
        console.error("Error fetching show:", error);
        setShowError(error.message);
        setShowData(null);
      } finally {
        setShowLoading(false);
      }
    };

    fetchShow();
  }, [selectedShowId]);

  // Process show tracks with Spotify data
  const showTracks = React.useMemo(() => {
    if (!showData?.songs) return [];
    return processShowTracks(showData.songs);
  }, [showData?.songs, processShowTracks]);

  // Count tracks that have Spotify data (can be added to playlist)
  const availableForPlaylist = React.useMemo(() => {
    return showTracks.filter((track) => track.uri && !track.spotifyError)
      .length;
  }, [showTracks]);

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
              color="gray.400"
              fontWeight="medium"
              fontSize="sm"
              textAlign="left"
            >
              Artist search, track lookup, and playlist creation powered by:
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
                width="160px"
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
        shouldShowTracks && (
          <Box width="full">
            {/* Tabs for "All Songs" vs "Pick a Show" */}
            <Tabs
              index={tabIndex}
              onChange={setTabIndex}
              variant="unstyled"
              mb={4}
            >
              <TabList justifyContent="center" gap={8}>
                <Tab
                  _selected={{
                    color: "brand.300",
                    _after: {
                      content: '""',
                      position: "absolute",
                      bottom: "-2px",
                      left: "0",
                      right: "0",
                      height: "2px",
                      bg: "brand.300",
                    },
                  }}
                  _hover={{ color: "brand.400" }}
                  fontWeight="medium"
                  fontSize="sm"
                  color="gray.400"
                  pb={3}
                  px={2}
                  bg="transparent"
                  border="none"
                  borderRadius="0"
                  transition="all 0.3s ease"
                  position="relative"
                  minW="auto"
                  w="auto"
                >
                  All Tour Songs
                </Tab>
                <Tab
                  _selected={{
                    color: "brand.300",
                    _after: {
                      content: '""',
                      position: "absolute",
                      bottom: "-2px",
                      left: "0",
                      right: "0",
                      height: "2px",
                      bg: "brand.300",
                    },
                  }}
                  _hover={{ color: "brand.400" }}
                  fontWeight="medium"
                  fontSize="sm"
                  color="gray.400"
                  pb={3}
                  px={2}
                  bg="transparent"
                  border="none"
                  borderRadius="0"
                  transition="all 0.3s ease"
                  position="relative"
                  minW="auto"
                  w="auto"
                  isDisabled={!hasShows}
                >
                  Pick a Show
                </Tab>
              </TabList>

              <TabPanels>
                {/* Tab 1: All Tour Songs */}
                <TabPanel px={0}>
                  {/* Track heading */}
                  <Box mb={6} width="full">
                    {tourData.tourName === "No Tour Info" ? (
                      <Text size="md" fontWeight="semibold">
                        Tracks <Text as="strong">{tourData.bandName}</Text> has
                        played in last {tourData.totalShows} shows:
                      </Text>
                    ) : (
                      <Text as="h4" size="md">
                        These are the tracks{" "}
                        <Text as="strong">{tourData.bandName}</Text> has played
                        on the "
                        <Text as="strong">
                          {tourData.tourName}
                          {!tourData.tourName
                            .trim()
                            .toLowerCase()
                            .endsWith("tour") && " Tour"}
                        </Text>
                        ":
                      </Text>
                    )}
                  </Box>

                  {/* Login/Create Playlist Button */}
                  <Flex
                    direction="column"
                    alignItems="center"
                    mb={6}
                    width="full"
                  >
                    {!isLoggedIn ? (
                      <Flex
                        align="center"
                        flexWrap="wrap"
                        justifyContent="center"
                        gap={2}
                        my={2}
                      >
                        <Button
                          size="md"
                          width="auto"
                          px={6}
                          py={3}
                          colorScheme="brand"
                          onClick={handleLoginClick}
                        >
                          Login
                        </Button>
                        <Text textAlign="center">to create playlist</Text>
                      </Flex>
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
                              size="md"
                              width="auto"
                              px={6}
                              py={3}
                              colorScheme="brand"
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
                            <Spinner size="sm" color="spotify.green" mr={2} />
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
                        color="spotify.green"
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                        _hover={{ color: "#1ed760" }}
                        transition="color 0.2s"
                      >
                        View your playlist on Spotify{" "}
                        <ExternalLinkIcon ml={1} />
                      </Link>
                    )}
                  </Flex>

                  {/* Tracks list */}
                  <Box width="full">
                    {spotifyData.map((item) => (
                      <Track key={item.id} item={item} tourData={tourData} />
                    ))}
                  </Box>
                </TabPanel>

                {/* Tab 2: Pick a Show */}
                <TabPanel px={0}>
                  {/* Show Selection Dropdown */}
                  <Box mb={6} width="full" maxW="600px" mx="auto">
                    <Select
                      placeholder={
                        hasShows
                          ? `Select a show (${sortedShows.length} available)`
                          : "No shows available"
                      }
                      value={selectedShowId || ""}
                      onChange={handleShowSelection}
                      isDisabled={!hasShows}
                      bg="gray.700"
                      borderColor="gray.600"
                      _hover={{ borderColor: "gray.500" }}
                      _focus={{
                        borderColor: "brand.300",
                        boxShadow: "0 0 0 1px var(--chakra-colors-brand-300)",
                      }}
                    >
                      {sortedShows.map((show) => (
                        <option
                          key={show.id}
                          value={show.id}
                          style={{ backgroundColor: "#2D3748", color: "white" }}
                        >
                          {formatShowDisplay(show)}
                        </option>
                      ))}
                    </Select>
                  </Box>

                  {/* Selected Show Tracks */}
                  {selectedShowId && (
                    <Box width="full">
                      {showLoading && (
                        <Box textAlign="center" py={8}>
                          <Spinner size="lg" color="brand.300" mb={4} />
                          <Text color="gray.400">Loading show tracks...</Text>
                        </Box>
                      )}

                      {showError && (
                        <Box textAlign="center" py={8}>
                          <Text color="red.400" mb={2}>
                            Error loading show data
                          </Text>
                          <Text color="gray.500" fontSize="sm">
                            {showError}
                          </Text>
                        </Box>
                      )}

                      {showData && !showLoading && !showError && (
                        <>
                          {/* Show Info Header */}
                          <Box mb={6} p={4} bg="gray.700" borderRadius="md">
                            <Text
                              fontSize="lg"
                              fontWeight="bold"
                              color="brand.300"
                              mb={2}
                            >
                              {formatShowDate(showData.showInfo?.date)} -{" "}
                              {showData.showInfo?.venue}
                            </Text>
                            <Text color="gray.400" fontSize="sm">
                              {showData.showInfo?.city},{" "}
                              {showData.showInfo?.country}
                            </Text>
                            <Text color="gray.500" fontSize="sm" mt={1}>
                              {showTracks.length} songs played
                              {availableForPlaylist < showTracks.length && (
                                <Text as="span" color="yellow.400" ml={2}>
                                  ({showTracks.length - availableForPlaylist}{" "}
                                  not on Spotify)
                                </Text>
                              )}
                            </Text>
                          </Box>

                          {/* Show-specific Login/Create Playlist Button */}
                          <Flex
                            direction="column"
                            alignItems="center"
                            mb={6}
                            width="full"
                          >
                            {!isLoggedIn ? (
                              <Flex
                                align="center"
                                flexWrap="wrap"
                                justifyContent="center"
                                gap={2}
                                my={2}
                              >
                                <Button
                                  size="md"
                                  width="auto"
                                  px={6}
                                  py={3}
                                  colorScheme="brand"
                                  onClick={handleLoginClick}
                                >
                                  Login
                                </Button>
                                <Text textAlign="center">
                                  to create show playlist
                                </Text>
                              </Flex>
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
                                      size="md"
                                      width="auto"
                                      px={6}
                                      py={3}
                                      colorScheme="brand"
                                      onClick={() => handleCreateShowPlaylist()}
                                      isDisabled={
                                        isCreatingShowPlaylist ||
                                        availableForPlaylist === 0
                                      }
                                    >
                                      Create Show Playlist (
                                      {availableForPlaylist} tracks)
                                    </Button>
                                  </Flex>
                                </VStack>

                                {/* Show playlist creation indicator */}
                                {isCreatingShowPlaylist && (
                                  <Flex
                                    align="center"
                                    mt={2}
                                    p={2}
                                    bg="gray.700"
                                    borderRadius="md"
                                  >
                                    <Spinner
                                      size="sm"
                                      color="spotify.green"
                                      mr={2}
                                    />
                                    <Text>Creating show playlist...</Text>
                                  </Flex>
                                )}
                              </>
                            )}

                            {/* Playlist URL Link for show playlist */}
                            {showPlaylistUrl && (
                              <Link
                                href={showPlaylistUrl}
                                isExternal
                                mt={4}
                                color="spotify.green"
                                fontWeight="bold"
                                display="flex"
                                alignItems="center"
                                _hover={{ color: "#1ed760" }}
                                transition="color 0.2s"
                              >
                                View your show playlist on Spotify{" "}
                                <ExternalLinkIcon ml={1} />
                              </Link>
                            )}
                          </Flex>

                          {/* Show Tracks List */}
                          {showTracks.length > 0 ? (
                            <Box width="full">
                              {showTracks.map((track, index) => (
                                <Box
                                  key={track.id || `track-${index}`}
                                  position="relative"
                                >
                                  {/* Show track order number */}
                                  <Box
                                    position="absolute"
                                    left="-30px"
                                    top="50%"
                                    transform="translateY(-50%)"
                                    color="gray.500"
                                    fontSize="sm"
                                    fontWeight="bold"
                                    width="20px"
                                    textAlign="right"
                                  >
                                    {track.showOrder}
                                  </Box>
                                  <Track item={track} tourData={tourData} />
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Text color="gray.500" textAlign="center" py={8}>
                              No songs found for this show
                            </Text>
                          )}
                        </>
                      )}
                    </Box>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
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
