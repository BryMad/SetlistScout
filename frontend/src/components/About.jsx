import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link,
  UnorderedList,
  ListItem,
} from "@chakra-ui/react";

export default function About() {
  return (
    <Box>
      <VStack spacing={6} align="start">
        <Heading
          as="h1"
          size="xl"
          bgGradient="linear(to-r, teal.400, green.400)"
          bgClip="text"
        >
          About Setlist Scout
        </Heading>

        <Text>
          Setlist Scout is a tool designed to help concert-goers prepare for
          upcoming shows by providing insights into what songs their favorite
          artists are currently playing on tour.
        </Text>

        <Text>
          Have you ever been to a concert and wished you were more familiar with
          the songs being played? Or maybe you want to make sure you know all
          the lyrics before the big show? Setlist Scout has you covered!
        </Text>

        <Heading as="h2" size="md" mt={4}>
          How It Works
        </Heading>

        <UnorderedList spacing={2} pl={4}>
          <ListItem>
            Search for your favorite artist using our search bar
          </ListItem>
          <ListItem>
            We'll analyze their recent setlists from their current tour
          </ListItem>
          <ListItem>
            See which songs they're most likely to play based on tour data
          </ListItem>
          <ListItem>
            Create a Spotify playlist with one click to start cramming for the
            show
          </ListItem>
        </UnorderedList>

        <Heading as="h2" size="md" mt={4}>
          Data Sources
        </Heading>

        <Text>
          Setlist Scout uses data from{" "}
          <Link href="https://www.setlist.fm" isExternal color="teal.400">
            Setlist.fm
          </Link>{" "}
          to analyze tour patterns and{" "}
          <Link href="https://www.spotify.com" isExternal color="teal.400">
            Spotify
          </Link>{" "}
          to create playlists and match songs.
        </Text>

        <Heading as="h2" size="md" mt={4}>
          Privacy
        </Heading>

        <Text>
          We only request the minimum Spotify permissions needed to create
          playlists on your behalf. We don't store any of your personal
          information beyond what's needed for the application to function.
        </Text>
      </VStack>
    </Box>
  );
}
