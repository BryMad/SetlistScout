import React from "react";
import { Box } from "@chakra-ui/react";
import Track from "./Track";

export default function TracksHUDTracksList({
  tracks,
  tourData,
  showOrder = false,
}) {
  return (
    <Box width="full">
      {tracks.map((track, index) => (
        <Box key={track.id || `track-${index}`} position="relative">
          {/* Show track order number if showOrder is true */}
          {showOrder && (
            <Box
              position="absolute"
              left="-30px"
              top="50%"
              transform="translateY(-50%)"
              color="gray.500"
              fontSize="sm"
              fontWeight="bold"
              width="20px"
              textAlign="right"
            >
              {track.showOrder}
            </Box>
          )}
          <Track item={track} tourData={tourData} />
        </Box>
      ))}
    </Box>
  );
}
