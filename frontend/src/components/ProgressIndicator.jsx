// src/components/ProgressIndicator.jsx
import React from "react";
import {
  Box,
  VStack,
  Spinner,
  Text,
  Progress,
  Image,
  Flex,
} from "@chakra-ui/react";
import spotifyLogo from "../assets/spotify_logo.svg"; // Make sure this path is correct

/**
 * Component to display progress updates during API requests
 *
 * @param {Object} props Component props
 * @param {boolean} props.isLoading Whether data is currently loading
 * @param {Object} props.progress Progress data { stage, message, percent }
 */
const ProgressIndicator = ({ isLoading, progress }) => {
  if (!isLoading) return null;

  const getStageEmoji = (stage) => {
    switch (stage) {
      case "musicbrainz":
        return "🔍";
      case "setlist_search":
        return "🎵";
      case "tour_processing":
        return "🚌";
      case "setlist_fetch":
        return "📋";
      case "song_processing":
        return "🎸";
      case "spotify_search":
        return null; // We'll use the Spotify logo image instead of an emoji
      case "complete":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  // Check if this is a Spotify-related message
  const isSpotifyMessage =
    progress.stage === "spotify_search" ||
    (progress.message && progress.message.includes("Spotify"));

  return (
    <VStack spacing={4} width="100%" my={4}>
      <Box
        display="flex"
        alignItems="center"
        minHeight="24px" // Fixed height for message container
        width="100%"
      >
        <Spinner size="sm" mr={2} flexShrink={0} />

        {isSpotifyMessage ? (
          // For Spotify messages, display logo + message
          <Flex align="center">
            <Image
              src={spotifyLogo}
              alt="Spotify"
              width="18px"
              height="18px"
              mr={2}
            />
            <Text fontSize="md">{progress.message}</Text>
          </Flex>
        ) : (
          // For other messages, display with emoji
          <Text fontSize="md">
            {getStageEmoji(progress.stage)} {progress.message}
          </Text>
        )}
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
