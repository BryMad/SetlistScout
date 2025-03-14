// src/components/Track.jsx
import React from "react";
import {
  Flex,
  Box,
  Text,
  Image,
  Link,
  useBreakpointValue,
} from "@chakra-ui/react";

export default function Track({ item, tourData }) {
  // Helper to convert spotify URI ("spotify:track:<id>") to an open spotify link
  const getSpotifyLink = (uri) => {
    const trackId = uri?.split(":").pop(); // e.g. "spotify:track:12345" => "12345"
    return `https://open.spotify.com/track/${trackId}`;
  };

  // Helper to clean song titles by removing remaster/remix information
  const cleanSongTitle = (title) => {
    if (!title) return title;
    //patterns to filter out
    const patterns = [
      /\s*-\s*(Remaster(ed)?|Remix(ed)?|Re-?master|Mix).*$/i,
      /\s*-\s*\d{4}(\s+.+)?$/i,
      /\s*-\s*(Deluxe|Special|Anniversary|Expanded).*$/i,
      /\s*-\s*(Mono|Stereo|Live|Acoustic|Single Version|Album Version|Radio Edit).*$/i,
      /\s*-\s*\(.*\)$/i,
      /\s*\(Remaster(ed)?|Remix(ed)?\).*$/i,
      /\s*\(\d{4}(\s+.+)?\)$/i,
    ];
    let cleanedTitle = title;
    // Apply each pattern to progressively clean the title
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, "");
    }
    return cleanedTitle.trim();
  };

  // Use default placeholder if item.image is undefined
  const albumCover = item.image
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Determine the layout based on screen size
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Mobile layout: artwork stacked on top of text
  if (isMobile) {
    return (
      <Box p={4} borderBottom="1px solid" borderColor="gray.700" width="100%">
        <Flex justify="space-between" mb={3}>
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="60px"
            objectFit="cover"
            borderRadius="2px"
            mr={3}
            flexShrink={0}
          />
          <Box textAlign="right">
            <Text color="gray.400" fontWeight="medium" fontSize="sm">
              {Math.round((item.count / tourData.totalShows) * 100)}% likelihood
            </Text>
            <Text color="gray.500" fontSize="xs">
              Played at {item.count} of {tourData.totalShows} shows
            </Text>
          </Box>
        </Flex>

        <Box>
          <Text fontWeight="bold" fontSize="md" mb={1}>
            {item.artistName ? item.artistName : item.artist}
          </Text>

          <Text fontSize="sm" color="gray.300" mb={1}>
            {item.songName
              ? cleanSongTitle(item.songName)
              : `${item.song} - not found on Spotify`}
          </Text>

          {item.uri && (
            <Link
              href={getSpotifyLink(item.uri)}
              isExternal
              color="#1DB954"
              fontSize="xs"
              opacity={0.9}
              _hover={{ opacity: 1 }}
            >
              LISTEN ON SPOTIFY
            </Link>
          )}
        </Box>
      </Box>
    );
  }

  // Desktop layout: three-column layout
  return (
    <Flex
      align="center"
      p={4}
      borderBottom="1px solid"
      borderColor="gray.700"
      width="100%"
    >
      {/* Column 1: Album artwork */}
      <Image
        src={albumCover}
        alt="Album cover"
        boxSize="64px"
        objectFit="cover"
        mr={4}
        flexShrink={0}
        borderRadius="4px"
      />

      {/* Column 2: Vertical stacking of artist, track name, and Spotify link */}
      <Box flex="1" overflow="hidden" mr={4}>
        <Text fontWeight="bold" fontSize="md" mb={1} noOfLines={1}>
          {item.artistName ? item.artistName : item.artist}
        </Text>

        <Text fontSize="sm" color="gray.300" mb={1} noOfLines={1}>
          {item.songName
            ? cleanSongTitle(item.songName)
            : `${item.song} - not found on Spotify`}
        </Text>

        {item.uri && (
          <Link
            href={getSpotifyLink(item.uri)}
            isExternal
            color="#1DB954"
            fontSize="xs"
            opacity={0.9}
            _hover={{ opacity: 1 }}
            display="block"
          >
            LISTEN ON SPOTIFY
          </Link>
        )}
      </Box>

      {/* Column 3: Likelihood information */}
      <Box textAlign="right" flexShrink={0} minWidth="100px">
        <Text color="gray.400" fontWeight="medium" mb={1}>
          {Math.round((item.count / tourData.totalShows) * 100)}% likelihood
        </Text>
        <Text color="gray.500" fontSize="sm">
          Played at {item.count} of {tourData.totalShows} shows
        </Text>
      </Box>
    </Flex>
  );
}
