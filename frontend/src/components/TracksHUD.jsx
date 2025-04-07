import React, { useEffect } from "react";
import {
  Button,
  Flex,
  Box,
  Divider,
  Heading,
  Image,
  Text,
  Link,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import Track from "./Track";
import AlertMessage from "./AlertMessage";
import ProgressIndicator from "./ProgressIndicator";
import { useAuth } from "../hooks/useAuth";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import spotifyLogo from "../assets/Spotify_Full_Logo_RGB_Green.png";

export default function TracksHUD() {
  const { isLoggedIn, login } = useAuth();
  const { createPlaylist, playlistUrl, clearPlaylistUrl } = useSpotify();
  const {
    spotifyData,
    tourData,
    loading,
    playlistNotification,
    setNotification,
    progress,
  } = useSetlist();

  // Calculate if we should show the tracks section
  const showTracks = spotifyData?.length > 0 && !loading;

  // Modified: Only clear playlist URL when new search is initiated
  // This will keep the URL visible after creation until a new search
  useEffect(() => {
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

  return (
    <Box mt={8} width="full" maxW="100%">
      {loading ? (
        <Box width="full" mb={8}>
          <ProgressIndicator isLoading={loading} progress={progress} />
        </Box>
      ) : (
        showTracks && (
          <Flex direction="column" alignItems="center" mb={8} width="full">
            {!isLoggedIn ? (
              <Flex
                align="center"
                flexWrap="wrap"
                justifyContent="center"
                gap={2}
                my={2}
              >
                <Button
                  size="sm" // Changed from "md" to "sm"
                  width="auto" // Changed from fixed width to auto
                  px={4} // Added horizontal padding
                  py={2} // Reduced vertical padding from 15px
                  bg="#1DB954"
                  color="white"
                  variant="solid" // Changed from "ghost" to "solid"
                  _hover={{
                    bg: "#1AA34A",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                  transition="all 0.2s ease" // Added transition for hover effects
                  borderRadius="full" // Made it pill-shaped
                  fontWeight="medium" // Slightly reduced font weight
                  letterSpacing="0.5px" // Added letter spacing
                  flexShrink={0}
                  onClick={() => login({ spotifyData, tourData })} // Kept the original onClick handler
                >
                  Login
                </Button>
                <Text textAlign="center">to create playlist on</Text>
                <Image
                  src={spotifyLogo}
                  alt="Spotify"
                  height="34px"
                  flexShrink={0}
                />
              </Flex>
            ) : (
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
                  bg="#1DB954"
                  color="white"
                  variant="solid"
                  _hover={{
                    bg: "#1AA34A",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                  transition="all 0.2s ease"
                  borderRadius="full"
                  fontWeight="medium"
                  letterSpacing="0.5px"
                  flexShrink={0}
                  onClick={createPlaylist} // Kept the original onClick handler
                >
                  Create
                </Button>
                <Text textAlign="center">playlist on</Text>
                <Image
                  src={spotifyLogo}
                  alt="Spotify"
                  height="34px"
                  flexShrink={0}
                />
              </Flex>
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
        )
      )}

      {/* Playlist Notification Message */}
      {playlistNotification && playlistNotification.message && (
        <AlertMessage
          status={playlistNotification.status}
          message={playlistNotification.message}
          onClose={() => setNotification({ message: "", status: "" })}
          width="full"
        />
      )}

      {showTracks && (
        <>
          <Box my={8} width="full">
            <Divider mb={4} />
            {tourData.tourName === "No Tour Info" ? (
              <Text size="md" fontWeight="semibold">
                Tracks <Text as="strong">{tourData.bandName}</Text> has played
                in last {tourData.totalShows} shows:
              </Text>
            ) : (
              <Text as="h4" size="md" fontWeight="semibold">
                tracks <Text as="strong">{tourData.bandName}</Text> has played
                on the{" "}
                <Text as="strong">
                  {tourData.tourName}
                  {!tourData.tourName.trim().toLowerCase().endsWith("tour") &&
                    " Tour"}
                </Text>
                :
              </Text>
            )}
          </Box>

          <Box width="full">
            {spotifyData.map((item) => (
              <Track key={item.id} item={item} tourData={tourData} />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
