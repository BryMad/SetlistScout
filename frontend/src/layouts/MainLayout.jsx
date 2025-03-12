// src/layouts/MainLayout.jsx
import React from "react";
import { Box, Container, SimpleGrid, Text, Link } from "@chakra-ui/react";
import AlertMessage from "../components/AlertMessage";
import { useSetlist } from "../hooks/useSetlist";

/**
 * Main layout component for the application
 * - Provides consistent structure across pages
 * - Handles global error display
 */
export default function MainLayout({ children }) {
  const { error, clearError } = useSetlist();

  return (
    <Box
      bg="gray.900"
      color="white"
      display="flex"
      flexDirection="column"
      minH="100vh"
    >
      <Container maxW="container.xl" flex="1" p={4}>
        {error && (
          <AlertMessage
            status="error"
            title="Error"
            message={error}
            onClose={clearError}
          />
        )}

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {children}
        </SimpleGrid>
      </Container>

      <Box as="footer" textAlign="center" fontSize="sm" opacity={0.8} p={4}>
        <Text>
          This app uses the Spotify API but is not endorsed, certified, or
          otherwise approved by Spotify. Spotify is a registered trademark of
          Spotify AB.
        </Text>
        <Text>
          Please see{" "}
          <Link
            href="https://developer.spotify.com/policy"
            color="blue.300"
            isExternal
          >
            Spotify Developer Policy
          </Link>{" "}
          and{" "}
          <Link
            href="https://developer.spotify.com/documentation/design"
            color="blue.300"
            isExternal
          >
            Brand Guidelines
          </Link>{" "}
          for more info.
        </Text>
      </Box>
    </Box>
  );
}
