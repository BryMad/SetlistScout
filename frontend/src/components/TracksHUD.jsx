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

  // Clear playlist URL when component updates with new spotifyData
  useEffect(() => {
    if (spotifyData && spotifyData.length > 0) {
      clearPlaylistUrl();
    }
  }, [spotifyData, clearPlaylistUrl]);

  return (
    <Box width="full" maxW="100%">
      {loading ? (
        <Box width="full" mb={8}>
          <ProgressIndicator isLoading={loading} progress={progress} />
        </Box>
      ) : (
        showTracks && (
          <Flex direction="column" alignItems="center" mb={8} width="full">
            {!isLoggedIn ? (
              <Flex align="center">
                <Button
                  size="md"
                  width="90px"
                  py="15px"
                  bg="#1DB954" /* Spotify green */
                  color="white"
                  variant="ghost"
                  _hover={{ bg: "#1AA34A" }}
                  onClick={() => login({ spotifyData, tourData })}
                  borderRadius="md"
                >
                  Login
                </Button>
                <Text mx={2}>to create playlist on</Text>
                <Image src={spotifyLogo} alt="Spotify" height="34px" />
              </Flex>
            ) : (
              <Flex align="center">
                <Button
                  size="md"
                  width="90px"
                  py="15px"
                  bg="#1DB954" /* Spotify green */
                  color="white"
                  _hover={{ bg: "green.600" }}
                  onClick={createPlaylist}
                >
                  Create
                </Button>
                <Text mx={2}> playlist on </Text>
                <Image src={spotifyLogo} alt="Spotify" height="34px" />
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
                View {tourData.bandName} playlist on Spotify{" "}
                <ExternalLinkIcon ml={1} />
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
