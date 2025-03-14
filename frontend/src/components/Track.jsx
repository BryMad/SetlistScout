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
  // Helper to convert Spotify URI ("spotify:track:<id>") to an open Spotify link
  const getSpotifyLink = (uri) => {
    const trackId = uri?.split(":").pop(); // e.g., "spotify:track:12345" => "12345"
    return `https://open.spotify.com/track/${trackId}`;
  };

  // Helper to clean song titles by removing remaster/remix information
  const cleanSongTitle = (title) => {
    if (!title) return title;
    // Patterns to filter out
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

  // Use a default placeholder if item.image is undefined
  const albumCover = item.image
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Determine the layout based on screen size
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Render mobile layout: two columns
  if (isMobile) {
    return (
      <Flex p={4} borderBottom="1px solid" borderColor="gray.700" width="100%">
        {/* Column 1: Image, Artist - Song Title, and Spotify link */}
        <Box flex="1">
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="60px"
            objectFit="cover"
            borderRadius="2px"
            mb={2}
          />
          <Text fontSize="md" noOfLines={1}>
            <Box as="span" fontWeight="bold">
              {item.artistName ? item.artistName : item.artist}
            </Box>
            {" - "}
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
              mt={1}
              display="block"
            >
              LISTEN ON SPOTIFY
            </Link>
          )}
        </Box>

        {/* Column 2: Likelihood and "Played at" info */}
        <Box ml={4} textAlign="right" minWidth="140px">
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

  // Render desktop layout: three columns
  return (
    <Flex
      align="center"
      p={4}
      borderBottom="1px solid"
      borderColor="gray.700"
      width="100%"
    >
      {/* Column 1: Album artwork */}
      <Box mr={4}>
        <Image
          src={albumCover}
          alt="Album cover"
          boxSize="64px"
          objectFit="cover"
          borderRadius="4px"
        />
      </Box>

      {/* Column 2: Artist - Song Title (row 1) and Spotify link (row 2) */}
      <Box flex="1" mr={4}>
        <Text fontSize="md" noOfLines={1}>
          <Box as="span" fontWeight="bold">
            {item.artistName ? item.artistName : item.artist}
          </Box>
          {" - "}
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
            mt={1}
            display="block"
          >
            LISTEN ON SPOTIFY
          </Link>
        )}
      </Box>

      {/* Column 3: Likelihood (row 1) and "Played at" info (row 2) */}
      <Box textAlign="right" minWidth="140px">
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
