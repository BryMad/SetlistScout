import React from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Link,
  UnorderedList,
  ListItem,
  Container,
  Button,
} from "@chakra-ui/react";
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

        <Heading as="h2" size="md" mt={4}>
          How It Works:
        </Heading>

        <UnorderedList spacing={2} pl={4}>
          <ListItem>
            Search for your favorite artist using our search bar
          </ListItem>
          <ListItem>
            Setlist Scout looks up their recent shows on{" "}
            <Link href="https://www.setlist.fm" isExternal color="teal.400">
              Setlist.fm
            </Link>
            , finds the songs they've been playing on tour, and tallies them up
            (in order of highest likelihood)
          </ListItem>
          <ListItem>
            Login to{" "}
            <Link href="https://www.spotify.com" isExternal color="teal.400">
              Spotify
            </Link>{" "}
            to create a playlist of these songs and start cramming for the show!
          </ListItem>
        </UnorderedList>

        <Heading as="h1" size="xl" color="teal.400">
          Issues
        </Heading>

        <Text>
          With the vast amount of artists and tour info out there, we often
          encounter errors or idiosyncrasies processing the data. If you're
          having trouble getting information for a specific artist, please{" "}
          <Link as={RouterLink} to="/contact" color="teal.400">
            contact us
          </Link>{" "}
          and let us know what's not working, and we'll try to fix it!
        </Text>
        <Box>
          <VStack spacing={6} align="start">
            <Heading as="h1" size="xl" color="teal.400">
              Privacy Policy
            </Heading>

            <Text>
              Setlist Scout is designed with privacy in mind. We collect only
              the minimum data necessary:
            </Text>

            <UnorderedList spacing={2} pl={4}>
              <ListItem>
                <Text as="span" fontWeight="semibold">
                  Spotify User ID:
                </Text>{" "}
                Stored temporarily to identify your account when creating
                playlists
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="semibold">
                  Spotify Access Tokens:
                </Text>{" "}
                Stored securely to perform authorized actions on your behalf
              </ListItem>
              <ListItem>
                <Text as="span" fontWeight="semibold">
                  Session Information:
                </Text>{" "}
                Stored in encrypted server-side sessions
              </ListItem>
            </UnorderedList>

            <Text>
              We use your data exclusively to create Spotify playlists based on
              your artist selections and maintain your login session.
            </Text>

            <Text>
              We do not analyze your listening habits, store your search
              history, track your application usage, or share your data with
              third parties (beyond necessary Spotify API interactions).{" "}
            </Text>

            <Text>
              All authentication data is stored in encrypted sessions that
              expire after 24 hours. We do not maintain databases of user
              information or activity. You can delete your session data at any
              time by logging out.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
