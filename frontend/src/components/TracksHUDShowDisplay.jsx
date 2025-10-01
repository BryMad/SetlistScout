import React from "react";
import { Box, Text, Spinner, Button } from "@chakra-ui/react";

export default function TracksHUDShowDisplay({
  showData,
  showLoading,
  showError,
  onRetry,
  formatShowDate,
  children,
}) {
  if (showLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="brand.300" mb={4} />
        <Text color="gray.400">Loading show tracks...</Text>
      </Box>
    );
  }

  if (showError) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.400" mb={3}>
          Unable to load show data
        </Text>
        <Button
          size="sm"
          colorScheme="brand"
          variant="outline"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  if (!showData) {
    return null;
  }

  return (
    <>
      {/* Show Info Header */}
      <Box mb={6} p={4} bg="gray.700" borderRadius="md">
        <Text fontSize="lg" fontWeight="bold" color="brand.300" mb={2}>
          {formatShowDate(showData.showInfo?.date)} -{" "}
          <Text as="span" color="gray.400" fontWeight="semibold">
            {showData.showInfo?.venue}, {showData.showInfo?.city}
          </Text>
        </Text>
        <Text color="gray.500" fontSize="sm" mt={1}>
          {children}
        </Text>
      </Box>
    </>
  );
}
