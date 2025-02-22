import React from "react";
import {
  Button,
  Flex,
  Box,
  VStack,
  Divider,
  Heading,
  Text,
  Link,
  Spinner,
} from "@chakra-ui/react";
import Track from "./Track";

export default function TracksHUD({
  spotifyLogin,
  createPlaylist,
  loggedIn,
  spotifyData,
  tourData,
  loading,
}) {
  return (
    <Box width={{ base: "100%" }} mt={8}>
      <Flex justify="center" align="flex-start" mb={8}>
        {/* {!loggedIn && spotifyData?.length === 0 && !loading && (
          <Text as="strong">
            find a show from your favorite artist on{" "}
            <Link
              href="https://www.setlist.fm"
              isExternal
              textDecoration="underline"
              color="blue.500"
            >
              setlist.fm
            </Link>{" "}
            and input the show's url to see what songs they're playing on tour
          </Text>
        )} */}

        {loading && (
          <VStack>
            <Spinner size="sm" />
            <Text mt={4} textAlign="center">
              Getting setlist data...
            </Text>
          </VStack>
        )}
        {!loggedIn && spotifyData?.length > 0 && !loading && (
          <Button
            size="xl"
            px="25px"
            py="15px"
            colorScheme="green"
            onClick={spotifyLogin}
          >
            Login to Spotify to create playlist
          </Button>
        )}
        {loggedIn && spotifyData?.length > 0 && !loading && (
          <Button
            size="xl"
            px="25px"
            py="15px"
            colorScheme="green"
            onClick={createPlaylist}
          >
            Create Playlist
          </Button>
        )}
      </Flex>

      {spotifyData?.length > 0 && !loading && (
        <Box my={8}>
          <Divider mb={4} />
          <Heading as="h4" size="md" fontWeight="semibold">
            Songs <Text as="strong">{tourData.bandName}</Text> has played on{" "}
            <Text as="strong">
              {tourData.tourName}
              {!tourData.tourName.trim().toLowerCase().endsWith("tour") &&
                " Tour"}
            </Text>
            :
          </Heading>
        </Box>
      )}

      <Flex justify="space-between" mt={8}>
        <Flex direction="column">
          {!loading &&
            spotifyData?.map((item) => (
              <Track key={item.id} item={item} tourData={tourData} />
            ))}
        </Flex>
      </Flex>
    </Box>
  );
}
