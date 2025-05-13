// src/components/ProgressIndicator.jsx - No Emoji Version
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

  return (
    <VStack spacing={4} width="100%" my={4}>
      <Box
        display="flex"
        alignItems="center"
        minHeight="24px" // Fixed height for message container
        width="100%"
      >
        <Spinner size="sm" mr={2} flexShrink={0} />
        <Text fontSize="md">{progress.message}</Text>
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
