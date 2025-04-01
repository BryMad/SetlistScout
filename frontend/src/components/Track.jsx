// src/components/Track.jsx
import React from "react";
import {
  Flex,
  Box,
  Text,
  Image,
  Link,
  useBreakpointValue,
  Divider,
} from "@chakra-ui/react";

// Import the Spotify logo
import spotifyLogo from "../assets/spotify_logo.svg";

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
      /\s+(Deluxe(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Special(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Anniversary(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Expanded(\s+Edition|\s+Version)?)\s*$/i,
    ];
    let cleanedTitle = title;
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, "");
    }
    return cleanedTitle.trim();
  };

  const cleanAlbumTitle = (title) => {
    if (!title) return title;
    const patterns = [
      /\s*-\s*(Remaster(ed)?|Remix(ed)?|Re-?master|Mix).*$/i,
      /\s*-\s*\d{4}(\s+.+)?$/i,
      /\s*-\s*(Deluxe|Special|Anniversary|Expanded).*$/i,
      /\s*-\s*(Mono|Stereo|Live|Acoustic|Single Version|Album Version|Radio Edit).*$/i,
      /\s*-\s*\(.*\)$/i,
      /\s*\(Remaster(ed)?|Remix(ed)?\).*$/i,
      /\s*\(\d{4}(\s+.+)?\)$/i,
      /\s+(Deluxe(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Special(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Anniversary(\s+Edition|\s+Version)?)\s*$/i,
      /\s+(Expanded(\s+Edition|\s+Version)?)\s*$/i,
      // Patterns for variants in parentheses
      /\s*\(?Deluxe(\s+Edition|\s+Version)?\)?.*$/i,
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
  console.log("Album cover URL:", albumCover); // Debugging line to check the URL
  const albumCoverMed = item.imageMed
    ? item.imageMed.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";
  console.log("Album cover medium URL:", albumCoverMed); // Debugging line to check the medium URL
  // Determine layout based on screen size.
  const isMobile = useBreakpointValue({ base: true, lg: false });

  // Mobile layout: two columns. Column 1 is the image; Column 2 has multiple rows.
  if (isMobile) {
    return (
      <Flex
        p={4}
        borderBottom="1px solid"
        borderColor="gray.700"
        width="100%"
        direction="row"
      >
        {/* Left column: Image and track info */}
        <Flex direction="column" flex="1" mr={3}>
          {/* Album artwork */}
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="64px"
            objectFit="cover"
            borderRadius="4px"
            mb={3}
          />

          {/* Track info */}
          <Box textAlign="left">
            {/* Track name */}
            <Text fontSize="md" fontWeight="bold" noOfLines={1}>
              {item.songName
                ? cleanSongTitle(item.songName)
                : `${item.song} - not found on Spotify`}
            </Text>

            {/* Artist name */}
            <Text fontSize="md" color="gray.300" noOfLines={1}>
              {item.artistName ? item.artistName : item.artist}
            </Text>

            {/* Album name */}
            {item.albumName && (
              <Text fontSize="sm" color="gray.400" noOfLines={1}>
                {cleanAlbumTitle(item.albumName)}
              </Text>
            )}
          </Box>
        </Flex>

        {/* Right column: Likelihood and Spotify button - UPDATED */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="flex-end"
          justifyContent="center"
          minWidth="120px"
        >
          {/* Likelihood */}
          <Flex alignItems="center" mb={1}>
            <Text color="gray.400" fontWeight="medium" fontSize="sm">
              {calculateLikelihood()}% likelihood
            </Text>
          </Flex>

          {/* Played at info */}
          <Text color="gray.500" fontSize="xs" mb={2}>
            Played at {getDisplayCount()} of {tourData.totalShows} shows
          </Text>

          {/* Spotify button */}
          {item.uri && (
            <Link
              href={getSpotifyLink(item.uri)}
              isExternal
              display="inline-flex"
              alignItems="center"
              bg="gray.700"
              color="#1DB954"
              fontWeight="bold"
              fontSize="xs"
              px={3}
              py={1}
              borderRadius="full"
              _hover={{
                bg: "gray.600",
                color: "#1DB954",
                textDecoration: "none",
              }}
            >
              <Image src={spotifyLogo} alt="Spotify" width="16px" mr={1} />
              OPEN SPOTIFY
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

      {/* Column 2: Artist name and Song Title in separate rows */}
      <Box flex="1" mr={4}>
        {/* Row 1: Track name */}
        <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
          {item.songName
            ? item.songName
            : `${item.song} - not found on Spotify`}
        </Text>

        {/* Row 2: Artist name */}
        <Text fontSize="sm" color="gray.300" noOfLines={1}>
          {item.artistName ? item.artistName : item.artist}
        </Text>

        {/* Row 3: Album name (new) */}
        {item.albumName && (
          <Text fontSize="sm" color="gray.400" noOfLines={1}>
            {item.albumName}
          </Text>
        )}
      </Box>

      {/* Column 3: Likelihood with Spotify logo, and Played at info */}
      <Box
        display="flex"
        flexDirection="column"
        alignItems="flex-end"
        justifyContent="center"
        minWidth="160px"
      >
        {/* Likelihood */}
        <Flex alignItems="center" mb={1}>
          <Text color="gray.400" fontWeight="medium" fontSize="sm">
            {calculateLikelihood()}% likelihood
          </Text>
        </Flex>

        {/* Played at info */}
        <Text color="gray.500" fontSize="xs" mb={2}>
          Played at {getDisplayCount()} of {tourData.totalShows} shows
        </Text>

        {/* Spotify button */}
        {item.uri && (
          <Link
            href={getSpotifyLink(item.uri)}
            isExternal
            display="inline-flex"
            alignItems="center"
            bg="gray.700"
            color="#1DB954"
            fontWeight="bold"
            fontSize="xs"
            px={3}
            py={1}
            borderRadius="full"
            _hover={{
              bg: "gray.600",
              color: "#1DB954",
              textDecoration: "none",
            }}
          >
            <Image src={spotifyLogo} alt="Spotify" width="16px" mr={1} />
            OPEN SPOTIFY
          </Link>
        )}
      </Box>
    </Flex>
  );
}
