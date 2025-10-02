import React from "react";
import { Box, Text, VStack } from "@chakra-ui/react";

export default function TracksHUDTourHeader({
  tourData,
  spotifyData,
  tourYears,
}) {
  return (
    <Box mb={6} p={4} bg="gray.800" borderRadius="md">
      <Text fontSize="lg" fontWeight="bold" color="brand.300" mb={2}>
        {tourData.bandName}
        {tourData.tourName !== "No Tour Info" && (
          <Text
            as="span"
            fontSize="lg"
            fontWeight="bold"
            color="brand.300"
            ml={2}
          >
            - {tourData.tourName}
            {!tourData.tourName.trim().toLowerCase().includes("tour") &&
              " Tour"}
          </Text>
        )}
      </Text>
      <VStack
        align="flex-start"
        spacing={0}
        color="gray.500"
        fontSize="sm"
        mt={2}
      >
        <Text>
          <Text as="span" fontWeight="semibold" color="gray.400">
            total shows:
          </Text>{" "}
          {tourData.totalShows}
        </Text>
        <Text>
          <Text as="span" fontWeight="semibold" color="gray.400">
            total songs:
          </Text>{" "}
          {spotifyData.length}
        </Text>
        <Text>
          <Text as="span" fontWeight="semibold" color="gray.400">
            avg songs per show:
          </Text>{" "}
          {tourData.totalShows > 0
            ? Math.round(
                spotifyData.reduce((sum, track) => sum + track.count, 0) /
                  tourData.totalShows
              )
            : 0}
        </Text>
        {tourYears && (
          <Text>
            <Text as="span" fontWeight="semibold" color="gray.400">
              years:
            </Text>{" "}
            {tourYears}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
