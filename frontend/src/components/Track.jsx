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
  // Convert Spotify URI ("spotify:track:<id>") to an open Spotify link.
  const getSpotifyLink = (uri) => {
    const trackId = uri?.split(":").pop(); // e.g., "spotify:track:12345" => "12345"
    return `https://open.spotify.com/track/${trackId}`;
  };

  // Remove remaster/remix info from song titles.
  const cleanSongTitle = (title) => {
    if (!title) return title;
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
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, "");
    }
    return cleanedTitle.trim();
  };

  // Use a default placeholder if item.image is undefined.
  const albumCover = item.image
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Determine layout based on screen size.
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Mobile layout: two columns. Column 1 is the image; Column 2 has five rows.
  if (isMobile) {
    return (
      <Flex
        p={4}
        borderBottom="1px solid"
        borderColor="gray.700"
        width="100%"
        align="flex-start"
      >
        {/* Column 1: Album cover */}
        <Box flexShrink={0}>
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="60px"
            objectFit="cover"
            borderRadius="2px"
          />
        </Box>

        {/* Column 2: Textual details */}
        <Box flex="1" ml={4}>
          {/* Row 1: Artist */}
          <Text fontSize="md" fontWeight="bold" noOfLines={1}>
            {item.artistName ? item.artistName : item.artist}
          </Text>

          {/* Row 2: Song name */}
          <Text fontSize="md" color="gray.300" noOfLines={1}>
            {item.songName
              ? cleanSongTitle(item.songName)
              : `${item.song} - not found on Spotify`}
          </Text>

          {/* Row 3: Likelihood */}
          <Text
            textAlign="right"
            color="gray.400"
            fontWeight="medium"
            fontSize="sm"
            mt={1}
          >
            {Math.round((item.count / tourData.totalShows) * 100)}% likelihood
          </Text>

          {/* Row 4: Played at info */}
          <Text textAlign="right" color="gray.500" fontSize="sm" mt={1}>
            Played at {item.count} of {tourData.totalShows} shows
          </Text>

          {/* Row 5: Listen on Spotify link */}
          {item.uri && (
            <Link
              textAlign="right"
              href={getSpotifyLink(item.uri)}
              isExternal
              color="#1DB954"
              fontSize="xs"
              opacity={0.9}
              _hover={{ opacity: 1 }}
              mt={2}
              display="block"
            >
              LISTEN ON SPOTIFY
            </Link>
          )}
        </Box>
      </Flex>
    );
  }

  // Desktop layout: three columns.
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

      {/* Column 2: Artist - Song Title and Spotify link */}
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

      {/* Column 3: Likelihood and Played at info */}
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
