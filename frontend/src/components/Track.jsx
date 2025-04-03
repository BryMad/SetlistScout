// File: ./src/components/Track.jsx
import React from "react";
import {
  Flex,
  Box,
  Text,
  Image,
  Link,
  CircularProgress,
  CircularProgressLabel,
  IconButton,
  Badge,
  useBreakpointValue,
  useColorModeValue,
  Tooltip,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { FaSpotify } from "react-icons/fa";

// Motion-enhanced Chakra components
const MotionFlex = motion(Flex);
const MotionBox = motion(Box);
const MotionBadge = motion(Badge);

/**
 * Enhanced Track component with modern data visualization
 */
export default function Track({ item, tourData }) {
  // Determine if this is a mobile layout
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Theme colors
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const statsBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  /**
   * Convert a Spotify URI ("spotify:track:12345") into an open.spotify.com link
   */
  const getSpotifyLink = (uri) => {
    const trackId = uri?.split(":").pop();
    return `https://open.spotify.com/track/${trackId}`;
  };

  /**
   * Clean extraneous info from track titles
   */
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

  /**
   * Clean extraneous info from album titles
   */
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
    ];
    let cleanedTitle = title;
    for (const pattern of patterns) {
      cleanedTitle = cleanedTitle.replace(pattern, "");
    }
    return cleanedTitle.trim();
  };

  /**
   * Calculate the likelihood percentage (capped at 100%)
   */
  const calculateLikelihood = () => {
    const percentage = Math.round((item.count / tourData.totalShows) * 100);
    return Math.min(percentage, 100);
  };

  /**
   * Return the times played, capped at total shows
   */
  const getDisplayCount = () => {
    return Math.min(item.count, tourData.totalShows);
  };

  /**
   * Get color scheme based on likelihood percentage
   */
  const getLikelihoodColor = () => {
    const percentage = calculateLikelihood();
    if (percentage >= 80) return "green";
    if (percentage >= 60) return "teal";
    if (percentage >= 40) return "blue";
    if (percentage >= 20) return "purple";
    return "pink";
  };

  /**
   * Get text for likelihood assessment
   */
  const getLikelihoodText = () => {
    const percentage = calculateLikelihood();
    if (percentage >= 80) return "Very Likely";
    if (percentage >= 60) return "Likely";
    if (percentage >= 40) return "Possible";
    if (percentage >= 20) return "Unlikely";
    return "Rare";
  };

  // Provide a fallback cover image if none is available
  const albumCover = item.image?.url
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Likelihood percentage and color
  const percentage = calculateLikelihood();
  const likelihoodColor = getLikelihoodColor();

  return (
    <MotionFlex
      p={4}
      bg={bgColor}
      borderRadius="none"
      boxShadow="sm"
      width="100%"
      my={2}
      align="center"
      justify="space-between"
      direction={isMobile ? "column" : "row"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Left section: Album art + Track info */}
      <Flex
        align="center"
        width={isMobile ? "100%" : "60%"}
        mb={isMobile ? 4 : 0}
      >
        {/* Album artwork with hover effect */}
        <MotionBox
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          mr={4}
        >
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="64px"
            objectFit="cover"
            borderRadius="md"
            boxShadow="md"
          />
        </MotionBox>

        {/* Track info */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color={textColor} noOfLines={1}>
            {item.songName
              ? cleanSongTitle(item.songName)
              : `${item.song ?? "Unknown"} (No Spotify match)`}
          </Text>

          <Text fontSize="sm" color={mutedColor} noOfLines={1}>
            {item.artistName || item.artist || "Unknown Artist"}
          </Text>

          {item.albumName && (
            <Text fontSize="xs" color={mutedColor} noOfLines={1}>
              {cleanAlbumTitle(item.albumName)}
            </Text>
          )}
        </Box>
      </Flex>

      {/* Right section: Enhanced likelihood HUD */}
      <MotionFlex
        bg={statsBg}
        borderRadius="md"
        p={3}
        width={isMobile ? "100%" : "240px"}
        align="center"
        justify="space-between"
        boxShadow="none"
        whileHover={{ boxShadow: "sm" }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Circular progress to visualize likelihood */}
        <CircularProgress
          value={percentage}
          size="60px"
          thickness="8px"
          color={`${likelihoodColor}.400`}
          trackColor={useColorModeValue("gray.100", "gray.600")}
        >
          <CircularProgressLabel fontWeight="bold" fontSize="sm">
            {percentage}%
          </CircularProgressLabel>
        </CircularProgress>

        {/* Likelihood assessment, show count, and Spotify button */}
        <Flex direction="column" mx={2} width="100%">
          <MotionBadge
            colorScheme={likelihoodColor}
            mb={1}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {getLikelihoodText()}
          </MotionBadge>

          <Text fontSize="xs" color={mutedColor} mb={2}>
            {getDisplayCount()} of {tourData.totalShows} shows
          </Text>

          {/* Spotify Link Button */}
          {item.uri && (
            <Link
              href={getSpotifyLink(item.uri)}
              isExternal
              display="flex"
              alignItems="center"
              fontSize="xs"
              fontWeight="medium"
              color="green.500"
              _hover={{ textDecoration: "none", color: "green.600" }}
            >
              <Box as={FaSpotify} mr={1} />
              OPEN SPOTIFY
            </Link>
          )}
        </Flex>
      </MotionFlex>
    </MotionFlex>
  );
}
