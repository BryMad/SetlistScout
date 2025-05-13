// File: ./frontend/src/components/TracksHUD.jsx
import React, { useState, useEffect } from "react";
import {
  Button,
  Flex,
  Box,
  Divider,
  Heading,
  Image,
  Text,
  Link,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import Track from "./Track";
import AlertMessage from "./AlertMessage";
import ProgressIndicator from "./ProgressIndicator";
import { useAuth } from "../hooks/useAuth";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import { getFromLocalStorage } from "../utils/storage";
import ConsentModal from "./ConsentModal";
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

  // State for consent modal
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // Determine if we should show the tracks section
  const showTracks = spotifyData?.length > 0 && !loading;

  // Clears prev playlist URL when a new search is initiated
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

  // Handle login button click
  const handleLoginClick = () => {
    // Check if user has already consented
    const hasConsented = getFromLocalStorage("setlistScoutConsent");

    if (hasConsented) {
      // If they have consented, proceed with login
      login({ spotifyData, tourData });
    } else {
      // If they haven't consented, show the consent modal
      setIsConsentModalOpen(true);
    }
  };

  // Handle consent modal close
  const handleConsentModalClose = () => {
    setIsConsentModalOpen(false);

    // Check if user has consented now (after modal closed)
    const hasConsented = getFromLocalStorage("setlistScoutConsent");
    if (hasConsented) {
      // If they consented in the modal, proceed with login
      login({ spotifyData, tourData });
    }
  };

  return (
    <Box width="full" maxW="100%">
      {/* Consent Modal - only shown when triggered */}
      <ConsentModal
        isOpen={isConsentModalOpen}
        onClose={handleConsentModalClose}
      />

      {loading ? (
        <Box width="full" mb={{ base: 3, md: 6 }}>
          <ProgressIndicator isLoading={loading} progress={progress} />
        </Box>
      ) : (
        showTracks && (
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
                    onClick={handleLoginClick} // Use the new handler instead of directly calling login
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
                <Text
                  fontSize="xs"
                  color="gray.500"
                  mt={2}
                  textAlign="left"
                  maxW="md"
                  px={2}
                >
                  note: awaiting Spotify approval for login/playlist creation to
                  be publicly available. Email{" "}
                  <Link href="mailto:setlistscout@gmail.com" color="teal.400">
                    setlistscout@gmail.com
                  </Link>{" "}
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
                      onClick={createPlaylist}
                      isDisabled={isCreatingPlaylist}
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
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    mt={2}
                    textAlign="left"
                    maxW="md"
                    px={2}
                  >
                    note: awaiting Spotify approval for login/playlist creation
                    to be publicly available. Email{" "}
                    <Link href="mailto:setlistscout@gmail.com" color="teal.400">
                      setlistscout@gmail.com
                    </Link>{" "}
                    to be a pre-approved beta user.
                  </Text>
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
          <Box my={6} width="full">
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
