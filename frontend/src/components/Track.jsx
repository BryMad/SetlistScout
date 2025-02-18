// File: ./src/components/Track.jsx
import React from "react";
import { Flex, Box, Text, Image, Button, Link } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export default function Track({ item, tourData }) {
  // Helper to convert spotify URI ("spotify:track:<id>") to an open link
  const getSpotifyLink = (uri) => {
    const trackId = uri?.split(":").pop(); // e.g. "spotify:track:12345" => "12345"
    return `https://open.spotify.com/track/${trackId}`;
  };

  // Use default placeholder if item.image is undefined
  const albumCover = item.image
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  return (
    <Flex
      align="center"
      p={4}
      borderBottom="1px solid"
      borderColor="gray.700"
      justify="space-between"
    >
      <Flex align="center">
        <Image
          src={albumCover}
          alt="Album cover"
          boxSize="64px"
          objectFit="cover"
          mr={4}
        />
        <Box>
          <Text fontWeight="bold" fontSize="lg" mb={1}>
            {item.artistName ? item.artistName : item.artist}
          </Text>
          <Text fontSize="md" color="gray.300">
            {item.songName
              ? item.songName
              : `${item.song} - not found on Spotify`}
          </Text>
        </Box>
      </Flex>

      {/* Probability or frequency */}
      <Box ml={4} textAlign="right">
        <Text color="gray.400" mb={2}>
          {Math.round((item.count / tourData.totalShows) * 100)}% likelihood
        </Text>

        {/* “Listen on Spotify” Button */}
        {item.uri && (
          <Link
            href={getSpotifyLink(item.uri)}
            isExternal
            _hover={{ textDecoration: "none" }}
          >
            <Button
              leftIcon={<ExternalLinkIcon />}
              backgroundColor="#1DB954" // Spotify brand green
              color="white"
              _hover={{ backgroundColor: "#1ed760" }}
              size="sm"
            >
              Listen on Spotify
            </Button>
          </Link>
        )}
      </Box>
    </Flex>
  );
}
