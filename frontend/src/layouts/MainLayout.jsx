// src/layouts/MainLayout.jsx
import React from "react";
import {
  Box,
  Container,
  Flex,
  Image,
  Text,
  Link,
  VStack,
} from "@chakra-ui/react";
import AlertMessage from "../components/AlertMessage";
import { useSetlist } from "../hooks/useSetlist";
import spotifyLogo from "../assets/Spotify_Full_Logo_RGB_Green.png";

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
        <Flex
          align="center"
          justify="center"
          mb={4}
          borderBottom="1px"
          borderColor="gray.700"
          pb={3}
        >
          <Text mr={2} color="#1DB954" fontSize="md">
            artist search, track search, and playlist creation powered by
          </Text>
          <Image
            src={spotifyLogo}
            alt="Spotify Logo"
            height="30px"
            width="auto"
          />
        </Flex>

        {/* Added VStack with padding bottom to group these text items */}
        <VStack spacing={2} pb={6}>
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
