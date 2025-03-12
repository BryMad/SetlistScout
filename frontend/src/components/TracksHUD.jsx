// src/components/TracksHUD.jsx (updated)
import React from "react";
import {
  Button,
  Flex,
  Box,
  VStack,
  Divider,
  Heading,
  Text,
} from "@chakra-ui/react";
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
    <Box width={{ base: "100%" }} mt={8}>
      <Flex justify="center" align="flex-start" mb={8}>
        {loading ? (
          <ProgressIndicator isLoading={loading} progress={progress} />
        ) : (
          showTracks && (
            <>
              {!isLoggedIn ? (
                <Button
                  size="xl"
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
                  size="xl"
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
            </>
          )
        )}
      </Flex>

      {/* Playlist Notification Message */}
      {playlistNotification && playlistNotification.message && (
        <AlertMessage
          status={playlistNotification.status}
          message={playlistNotification.message}
          onClose={() => setNotification({ message: "", status: "" })}
        />
      )}

      {showTracks && (
        <Box my={8}>
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
      )}

      <Flex justify="space-between" mt={8}>
        <Flex direction="column" width="100%">
          {showTracks &&
            spotifyData.map((item) => (
              <Track key={item.id} item={item} tourData={tourData} />
            ))}
        </Flex>
      </Flex>
    </Box>
  );
}
