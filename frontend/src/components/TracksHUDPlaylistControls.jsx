import React from "react";
import {
  Button,
  Flex,
  Text,
  Link,
  VStack,
  Spinner,
  Box,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export default function TracksHUDPlaylistControls({
  isLoggedIn,
  onLogin,
  onCreatePlaylist,
  isCreatingPlaylist,
  playlistUrl,
  buttonText = "Create Playlist",
  loginText = "to create playlist",
  playlistLinkText = "View your playlist on Spotify",
  trackCount = null,
}) {
  return (
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
            onClick={onLogin}
          >
            Login
          </Button>
          <Text textAlign="center">{loginText}</Text>
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
                onClick={onCreatePlaylist}
                isDisabled={
                  isCreatingPlaylist ||
                  (trackCount !== null && trackCount === 0)
                }
              >
                {trackCount !== null
                  ? `${buttonText} (${trackCount} tracks)`
                  : buttonText}
              </Button>
            </Flex>
          </VStack>

          {/* Creating playlist indicator */}
          {isCreatingPlaylist && (
            <Flex align="center" mt={2} p={2} bg="gray.700" borderRadius="md">
              <Spinner size="sm" color="spotify.green" mr={2} />
              <Text>Creating playlist...</Text>
            </Flex>
          )}
        </>
      )}

      {/* Playlist URL Link */}
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
          {playlistLinkText} <ExternalLinkIcon ml={1} />
        </Link>
      )}
    </Flex>
  );
}
