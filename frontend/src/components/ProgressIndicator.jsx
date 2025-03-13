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
      <Box
        display="flex"
        alignItems="center"
        minHeight="24px" // Fixed height for message container
        width="100%"
      >
        <Spinner size="sm" mr={2} flexShrink={0} />
        <Text fontSize="md">
          {getStageEmoji(progress.stage)} {progress.message}
        </Text>
      </Box>

      <Box width="100%" height="20px">
        {" "}
        {/* Fixed height container for progress bar */}
        <Progress
          value={progress.percent !== null ? progress.percent : 0}
          size="sm"
          width="100%"
          colorScheme="teal"
          hasStripe
          isAnimated
          borderRadius="md"
        />
      </Box>
    </VStack>
  );
};

export default ProgressIndicator;
