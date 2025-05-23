// src/components/LastFmAttribution.jsx
import React from "react";
import { Box, Link, Image, Text, HStack } from "@chakra-ui/react";

/**
 * Last.fm Attribution Component
 * Required by Last.fm Terms of Service for API usage
 * Links back to Last.fm as required
 */
export default function LastFmAttribution({ size = "sm" }) {
  return (
    <Box
      mt={2}
      p={2}
      bg="gray.800"
      borderRadius="md"
      border="1px solid"
      borderColor="gray.700"
    >
      <Link
        href="https://www.last.fm"
        isExternal
        _hover={{ textDecoration: "none" }}
      >
        <HStack spacing={2} justify="center" align="center">
          <Text fontSize={size} color="gray.300">
            Powered by
          </Text>
          <Text fontSize={size} color="red.400" fontWeight="bold">
            Last.fm
          </Text>
        </HStack>
      </Link>
    </Box>
  );
}
