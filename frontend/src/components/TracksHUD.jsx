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
