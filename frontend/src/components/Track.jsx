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

// Import the Spotify logo
import spotifyLogo from "../assets/spotify_logo_white.svg";

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

  // Calculate likelihood percentage, capped at 100%
  const calculateLikelihood = () => {
    const percentage = Math.round((item.count / tourData.totalShows) * 100);
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Get display count, capped at totalShows
  const getDisplayCount = () => {
    return Math.min(item.count, tourData.totalShows);
  };

  // Use a default placeholder if item.image is undefined.
  const albumCover = item.image
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Determine layout based on screen size.
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Mobile layout: two columns. Column 1 is the image; Column 2 has multiple rows.
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

          {/* Row 3: Likelihood with Spotify logo */}
          <Flex justifyContent="flex-end" alignItems="center" mt={1}>
            <Text color="gray.400" fontWeight="medium" fontSize="sm" mr={2}>
              {calculateLikelihood()}% likelihood
            </Text>
            {item.uri && (
              <Link
                href={getSpotifyLink(item.uri)}
                isExternal
                display="flex"
                alignItems="center"
                opacity={0.9}
                _hover={{ opacity: 1 }}
              >
                <Image src={spotifyLogo} alt="Listen on Spotify" width="16px" />
              </Link>
            )}
          </Flex>

          {/* Row 4: Played at info */}
          <Text textAlign="right" color="gray.500" fontSize="xs" mt={1}>
            Played at {getDisplayCount()} of {tourData.totalShows} shows
          </Text>
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

      {/* Column 2: Artist name and Song Title in separate rows */}
      <Box flex="1" mr={4}>
        {/* Row 1: Artist name */}
        <Text fontSize="md" fontWeight="bold" noOfLines={1}>
          {item.artistName ? item.artistName : item.artist}
        </Text>

        {/* Row 2: Song name - full version for desktop */}
        <Text fontSize="md" color="gray.300" noOfLines={1}>
          {item.songName
            ? item.songName
            : `${item.song} - not found on Spotify`}
        </Text>
      </Box>

      {/* Column 3: Likelihood with Spotify logo, and Played at info */}
      <Box textAlign="right" minWidth="140px">
        {/* Likelihood and Spotify logo on the same line */}
        <Flex justifyContent="flex-end" alignItems="center" mb={1}>
          <Text color="gray.400" fontWeight="medium" mr={2}>
            {calculateLikelihood()}% likelihood
          </Text>
          {item.uri && (
            <Link
              href={getSpotifyLink(item.uri)}
              isExternal
              display="flex"
              alignItems="center"
              _hover={{ opacity: 1 }}
              opacity={0.9}
            >
              <Image src={spotifyLogo} alt="Listen on Spotify" width="18px" />
            </Link>
          )}
        </Flex>

        {/* Played at info */}
        <Text color="gray.500" fontSize="xs">
          Played at {getDisplayCount()} of {tourData.totalShows} shows
        </Text>
      </Box>
    </Flex>
  );
}
