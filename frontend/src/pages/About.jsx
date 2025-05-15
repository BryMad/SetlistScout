import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Flex,
  Icon,
  Link,
  UnorderedList,
  ListItem,
  Container,
  Button,
} from "@chakra-ui/react";
import { EmailIcon } from "@chakra-ui/icons";
import { Link as RouterLink } from "react-router-dom";

export default function About() {
  return (
    <Container maxW="container.md" mt={8}>
      <VStack spacing={6} align="start">
        <Heading as="h1" size="xl" color="teal.400">
          About Setlist Scout
        </Heading>

        <Text>
          Setlist Scout is a tool designed to help concert-goers prepare for
          upcoming shows by providing insights into what songs their favorite
          artists are playing on tour.
        </Text>

        <Heading as="h1" size="xl" color="teal.400">
          How It Works:
        </Heading>

        <UnorderedList spacing={2} pl={4}>
          <ListItem>
            Search for your favorite artist using our search bar. Artists will
            be populated by{" "}
            <Link href="https://www.deezer.com/us/" isExternal color="teal.400">
              Deezer API
            </Link>{" "}
            search data. Select an artist...
          </ListItem>
          <ListItem>
            ...and Setlist Scout will look up the artist's recent shows on{" "}
            <Link href="https://www.setlist.fm" isExternal color="teal.400">
              Setlist.fm
            </Link>
            , find the songs they've been playing on tour, and tally them up.
            The songs will be displayed in order of most played, along with
            track and album information from{" "}
            <Link href="https://www.spotify.com" isExternal color="teal.400">
              Spotify.
            </Link>{" "}
          </ListItem>
          <ListItem>
            If you want to, you can also click the LOGIN button to login to{" "}
            <Link href="https://www.spotify.com" isExternal color="teal.400">
              Spotify
            </Link>{" "}
            to create a playlist of these songs to start preparing for the show!
          </ListItem>
        </UnorderedList>

        <Heading as="h1" size="xl" color="teal.400">
          Issues/Contact
        </Heading>

        <Text>
          <p>
            With the vast amount of artists out there and the fact that most{" "}
            <Link href="https://www.setlist.fm" isExternal color="teal.400">
              Setlist.fm
            </Link>{" "}
            concert info is submitted by fans, we often encounter errors or
            idiosyncrasies in the data.
          </p>
          <br></br>
          <p>
            If you're having trouble getting information for a specific artist,
            please email us at{" "}
            <Box as="span" display="inline" whiteSpace="nowrap">
              <Icon as={EmailIcon} mr={2} color="teal.400" />
              <Link href="mailto:setlistscout@gmail.com" color="teal.400">
                setlistscout@gmail.com
              </Link>
            </Box>
            , let us know what's not working, and we'll try to fix it!
          </p>
        </Text>
      </VStack>
    </Container>
  );
}
