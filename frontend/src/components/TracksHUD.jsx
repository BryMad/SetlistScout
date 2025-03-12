import React from "react";
import {
  Button,
  Flex,
  Box,
  VStack,
  Divider,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  CloseButton,
} from "@chakra-ui/react";
import Track from "./Track";

export default function TracksHUD({
  spotifyLogin,
  createPlaylist,
  loggedIn,
  spotifyData,
  tourData,
  loading,
  playlistNotification,
}) {
  return (
    <Box width={{ base: "100%" }} mt={8}>
      <Flex justify="center" align="flex-start" mb={8}>
        {loading && (
          <VStack>
            <Spinner size="sm" />
            <Text mt={4} textAlign="center">
              Getting setlist data...
            </Text>
          </VStack>
        )}

        {!loggedIn && spotifyData?.length > 0 && !loading && (
          <Button
            size="xl"
            px="25px"
            py="15px"
            colorScheme="green"
            bg="green.500"
            color="white"
            _hover={{ bg: "green.600" }}
            onClick={spotifyLogin}
          >
            Login to Spotify to create playlist
          </Button>
        )}

        {loggedIn && spotifyData?.length > 0 && !loading && (
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
      </Flex>

      {/* Playlist Notification Message */}
      {playlistNotification && playlistNotification.message && (
        <Alert
          status={playlistNotification.status}
          variant="solid"
          mb={4}
          borderRadius="md"
          position="relative"
        >
          <AlertIcon />
          <Text flex="1">{playlistNotification.message}</Text>
          <CloseButton position="absolute" right="8px" top="8px" />
        </Alert>
      )}

      {spotifyData?.length > 0 && !loading && (
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
          {!loading &&
            spotifyData?.map((item) => (
              <Track key={item.id} item={item} tourData={tourData} />
            ))}
        </Flex>
      </Flex>
    </Box>
  );
}
