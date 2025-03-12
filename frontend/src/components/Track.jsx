import React from "react";
import { Flex, Box, Text, Image, Link } from "@chakra-ui/react";

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

          {/* Song name linked to Spotify, if we have a valid URI */}
          <Text fontSize="md" color="gray.300">
            {item.uri ? (
              <Link
                href={getSpotifyLink(item.uri)}
                isExternal
                color="teal.400"
                textDecoration="underline"
              >
                {item.songName
                  ? cleanSongTitle(item.songName)
                  : `${item.song} - not found on Spotify`}
              </Link>
            ) : // Fallback if there is no URI
            item.songName ? (
              cleanSongTitle(item.songName)
            ) : (
              `${item.song} - not found on Spotify`
            )}
          </Text>
        </Box>
      </Flex>

      <Box ml={4} textAlign="right">
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
