// src/layouts/MainLayout.jsx
import React from "react";
import { Box, Container, Text, Link, VStack } from "@chakra-ui/react";
import AlertMessage from "../components/AlertMessage";
import { useSetlist } from "../hooks/useSetlist";

export default function MainLayout({ children }) {
  const { error, clearError } = useSetlist();

  return (
    <Box
      bg="gray.900"
      color="white"
      display="flex"
      flexDirection="column"
      minH="100vh"
      width="100%"
    >
      {/* Main content - will grow to fill available space */}
      <Box flex="1">
        <Container
          maxW="container.xl"
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
      </Box>

      {/* Footer - won't flex grow */}
      <Box as="footer" textAlign="center" fontSize="sm" opacity={0.8} p={4}>
        <VStack spacing={2}>
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
        </VStack>
      </Box>
    </Box>
  );
}
