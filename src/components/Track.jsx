import React from "react";

import { Flex, Box, Text, Image } from "@chakra-ui/react";

export default function Track({ item, tourData }) {
  return (
    <Flex align="center" p={4} borderBottom="1px solid" borderColor="gray.700">
      <Image src={item.image ? item.image.url : "https://icons.veryicon.com/png/o/miscellaneous/small-icons-in-the-art-room/question-mark-42.png"} alt="Album cover" boxSize="64px" objectFit="cover" mr={4} />
      <Box flex="1">
        <Text fontWeight="bold" fontSize="lg" mb={1}>
          {item.artistName ? item.artistName : item.artist}
        </Text>
        <Text fontSize="md" color="gray.300">
          {item.songName ? item.songName : `${item.song} - not found on Spotify`}
        </Text>
      </Box>
      <Box ml={4}>
        <Text color="gray.400">
          {" "}
          {Math.round((item.count / tourData.totalShows) * 100)}% likelihood
          {/* {Math.round((item.count / tourData.totalShows) * 100) > 100 && " (artist may be playing this song twice at some shows)"} */}
        </Text>
      </Box>
    </Flex>
  );
}
