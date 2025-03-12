// src/components/ProgressIndicator.jsx
import React from "react";
import { Box, VStack, Spinner, Text, Progress } from "@chakra-ui/react";

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
        return "🎧";
      case "complete":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  return (
    <VStack spacing={4} width="100%" my={4}>
      <Box display="flex" alignItems="center">
        <Spinner size="sm" mr={2} />
        <Text fontSize="md">
          {getStageEmoji(progress.stage)} {progress.message}
        </Text>
      </Box>

      <Progress
        value={progress.percent !== null ? progress.percent : 0}
        size="sm"
        width="100%"
        colorScheme="teal"
        hasStripe
        isAnimated
        borderRadius="md"
      />
    </VStack>
  );
};

export default ProgressIndicator;
