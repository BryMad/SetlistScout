import React, { useEffect, useState } from "react";
import {
  Flex,
  Box,
  Text,
  Image,
  Link,
  CircularProgress,
  CircularProgressLabel,
  Badge,
  useBreakpointValue,
  useColorModeValue,
  Tooltip,
  Button,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";

// Motion-enhanced Chakra components
const MotionFlex = motion(Flex);
const MotionBadge = motion(Badge);
const MotionText = motion(Text);

/**
 * Enhanced Track component with modern data visualization and balanced animations
 */
export default function Track({ item, tourData }) {
  // State for animated percentage
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  // Determine if this is a mobile layout - moved earlier to prevent layout shifts
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Theme colors
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const statsBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "white");
  const mutedColor = useColorModeValue("gray.500", "gray.400");
  // Spotify brand green color
  const spotifyGreen = "#1DB954";
  const spotifyGreenHover = "#1AA34A";

  // Animate the percentage value on mount - optimized animation speed
  useEffect(() => {
    const targetPercentage = calculateLikelihood();
    let startTime = null;
    let animationFrameId = null;

    // Animation function
    const animateProgress = (timestamp) => {
      if (!startTime) startTime = timestamp;

      // Calculate elapsed time
      const elapsedTime = timestamp - startTime;
      // Animation duration (reduced from 2000ms to 800ms)
      const duration = 800;
      // Calculate raw progress (0 to 1)
      const rawProgress = Math.min(elapsedTime / duration, 1);

      // Linear animation - no easing
      const currentValue = Math.round(rawProgress * targetPercentage);
      setAnimatedPercentage(currentValue);

      // Continue animation until complete
      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(animateProgress);
      }
    };

    // Start animation immediately
    animationFrameId = requestAnimationFrame(animateProgress);

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

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
    if (percentage >= 80) return "purple";
    if (percentage >= 60) return "blue";
    if (percentage >= 40) return "yellow";
    if (percentage >= 20) return "orange";
    return "red";
  };

  /**
   * Get text for likelihood assessment
   */
  const getLikelihoodText = () => {
    const percentage = calculateLikelihood();
    if (percentage >= 80) return "Very Likely";
    if (percentage >= 60) return "Likely";
    if (percentage >= 40) return "Possible";
    if (percentage >= 20) return "Rare";
    return "Very Rare";
  };

  // Provide a fallback cover image if none is available
  const albumCover = item.image?.url
    ? item.image.url
    : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png";

  // Likelihood percentage and color
  const percentage = calculateLikelihood();
  const likelihoodColor = getLikelihoodColor();

  // Skip animation if isMobile is undefined (prevents layout shift)
  if (isMobile === undefined) {
    return null; // Render nothing until breakpoint is determined
  }

  return (
    <MotionFlex
      p={3}
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
      transition={{ duration: 0.4 }} // Reduced from 0.8 to 0.4
    >
      {/* Left section: Album art + Track info */}
      <Flex
        align="center"
        width={isMobile ? "100%" : "60%"}
        mb={isMobile ? 3 : 0}
      >
        {/* Album artwork - no animation per Spotify guidelines */}
        <Box mr={4}>
          <Image
            src={albumCover}
            alt="Album cover"
            boxSize="64px"
            objectFit="cover"
            borderRadius="2px"
            boxShadow="md"
          />
        </Box>

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
        borderRadius="md"
        p={2}
        width={isMobile ? "100%" : "auto"}
        align="center"
        justify="flex-end"
        boxShadow="none"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }} // Reduced from 0.65/0.2 to 0.35/0.1
      >
        {/* Circular progress to visualize likelihood */}
        <Box position="relative" mr={4}>
          <CircularProgress
            value={animatedPercentage}
            size="55px"
            thickness="5px"
            color={`${likelihoodColor}.400`}
            trackColor={useColorModeValue("gray.100", "gray.600")}
          >
            <CircularProgressLabel fontWeight="bold" fontSize="xs">
              {animatedPercentage}%
            </CircularProgressLabel>
          </CircularProgress>
        </Box>

        {/* Vertical divider */}
        <Box
          width="1px"
          height="50px"
          bg={useColorModeValue("gray.200", "gray.600")}
          mr={4}
        />

        {/* Likelihood assessment, show count, and Spotify button */}
        <Flex
          direction="column"
          width="auto"
          height="100%"
          justify="space-between"
          align="flex-end"
        >
          <Badge
            colorScheme={likelihoodColor}
            mb={1}
            px={2}
            alignSelf="flex-end"
          >
            {getLikelihoodText()}
          </Badge>

          <Text fontSize="xs" color={mutedColor} mb={1} textAlign="right">
            {getDisplayCount()} of {tourData.totalShows} shows
          </Text>

          {/* Spotify Button - consistent size for both states */}
          <Button
            as={item.uri ? "a" : "button"}
            href={item.uri ? getSpotifyLink(item.uri) : undefined}
            size="xs"
            variant={item.uri ? "spotify" : "outline"}
            width="110px"
            height="24px"
            mt={1}
            fontWeight="medium"
            fontSize="xs"
            target={item.uri ? "_blank" : undefined}
            rel={item.uri ? "noopener noreferrer" : undefined}
            alignSelf="flex-end"
            isDisabled={!item.uri}
            opacity={item.uri ? 1 : 0.6}
          >
            {item.uri ? "OPEN SPOTIFY" : "NO MATCH"}
          </Button>
        </Flex>
      </MotionFlex>
    </MotionFlex>
  );
}
