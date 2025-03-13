// src/components/TracksHUD.jsx
import React from "react";
import { Button, Flex, Box, Divider, Heading, Text } from "@chakra-ui/react";
import Track from "./Track";
import AlertMessage from "./AlertMessage";
import ProgressIndicator from "./ProgressIndicator";
import { useAuth } from "../hooks/useAuth";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";

export default function TracksHUD() {
  const { isLoggedIn, login } = useAuth();
  const { createPlaylist } = useSpotify();
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

  return (
    <Box width="full" maxW="100%">
      {loading ? (
        <Box width="full" mb={8}>
          <ProgressIndicator isLoading={loading} progress={progress} />
        </Box>
      ) : (
        showTracks && (
          <Flex justify="center" mb={8} width="full">
            {!isLoggedIn ? (
              <Button
                size="lg"
                px="25px"
                py="15px"
                colorScheme="green"
                bg="green.500"
                color="white"
                _hover={{ bg: "green.600" }}
                onClick={() => login({ spotifyData, tourData })}
              >
                Login to Spotify to create playlist
              </Button>
            ) : (
              <Button
                size="lg"
                px="25px"
                py="15px"
                colorScheme="green"
                bg="green.500"
                color="white"
                _hover={{ bg: "green.600" }}
                onClick={createPlaylist}
              >
                Create Playlist
              </Button>
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
              <Heading as="h4" size="md" fontWeight="semibold">
                Songs <Text as="strong">{tourData.bandName}</Text> has played in
                last {tourData.totalShows} shows:
              </Heading>
            ) : (
              <Heading as="h4" size="md" fontWeight="semibold">
                Songs <Text as="strong">{tourData.bandName}</Text> has played on{" "}
                <Text as="strong">
                  {tourData.tourName}
                  {!tourData.tourName.trim().toLowerCase().endsWith("tour") &&
                    " Tour"}
                </Text>
                :
              </Heading>
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
