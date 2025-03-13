// src/layouts/MainLayout.jsx
import React from "react";
import { Box, Container, Text, Link } from "@chakra-ui/react";
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
      minH="calc(100vh - 60px)"
      width="100%"
    >
      <Container
        maxW="container.xl"
        flex="1"
        px={{ base: 2, md: 4 }}
        py={{ base: 3, md: 5 }}
        width="100%"
      >
        {error && (
          <AlertMessage
            status="error"
            title="Error"
            message={error}
            onClose={clearError}
          />
        )}

        {children}
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
