import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  HStack,
  Flex,
  Input,
  Image,
  Box,
  VStack,
  List,
  ListItem,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { server_url } from "../App";

export default function UserInput({
  userInput,
  setUserInput,
  loading,
  setLoading,
  fetchSetlists,
  setSpotifyData,
  setTourData,
  setDisplayError,
}) {
  // ! TODO put back into app.jsx??
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // For closing the dropdown when user clicks outside
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedArtist && selectedArtist.name === artistQuery) return;
    const debounceTimeout = setTimeout(() => {
      if (artistQuery.length >= 1) {
        fetchArtistSuggestions(artistQuery);
      } else {
        setSuggestions([]); // Clear if too short
      }
    }, 300);
    return () => clearTimeout(debounceTimeout);
  }, [artistQuery]);

  const fetchArtistSuggestions = async (query) => {
    try {
      setLoading(true);
      const response = await fetch(`${server_url}/setlist/artist_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistName: query }),
      });
      if (!response.ok) {
        throw new Error("Network response was not OK");
      }
      const data = await response.json();
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching artist suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTour = async (artist) => {
    // For now, just fill the input with the chosen artist's name
    // or do something else like run a separate "get setlist" call

    setArtistQuery(artist.name);
    setSuggestions([]);
    setSelectedArtist(artist); // Set selected artist
    try {
      // TODO second loading or separate logic for other side
      setLoading(true);
      const response = await fetch(`${server_url}/setlist/`, {
        method: "post",
        cors: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ artist: artist.name }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          setDisplayError(
            "Too many requests. Setlist.fm is rate-limiting us. Please try again later."
          );
        } else {
          // Fallback for 400, 500, etc.
          setDisplayError(errorData.error || "An error occurred.");
        }

        // We exit here, so we don't process further.
        return;
      }
      const data = await response.json();

      setSpotifyData(data.spotifySongsOrdered || []);
      setTourData(data.tourData || []);
      setArtistQuery("");
      setSelectedArtist(null);

      console.log(data.spotifySongsOrdered);
      console.log(data.tourData);
    } catch (error) {
      console.error("Error fetching setlists:", error);
    } finally {
      setLoading(false);
    }

    // ! artist.name
  };

  // Close dropdown if user clicks outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      alignItems="center"
      justifyContent="center"
      // mt={8}
    >
      <Text fontWeight="bold" mb={2}>
        Search for an Artist
      </Text>
      <Input
        placeholder="Type an artist name"
        value={artistQuery}
        onChange={(e) => setArtistQuery(e.target.value)}
        size="lg"
        variant="outline"
      />
      {loading && (
        <Box mt={2}>
          <Spinner size="sm" />
          <Text as="span" ml={2}>
            Searching...
          </Text>
        </Box>
      )}
      {/* Render suggestions in a "dropdown" style */}
      {suggestions.length > 0 && (
        <Box
          position="absolute"
          zIndex="10"
          bg="gray.700"
          mt={2}
          width="100%"
          borderRadius="md"
          overflow="hidden"
        >
          <List spacing={0}>
            {suggestions.map((artist) => (
              <ListItem
                key={artist.id}
                px={4}
                py={2}
                _hover={{ backgroundColor: "gray.600", cursor: "pointer" }}
                onClick={() => fetchTour(artist)}
              >
                <HStack spacing={3}>
                  {/* Artist Image */}
                  <Image
                    src={artist.image?.url || "https://via.placeholder.com/40"} // Placeholder if no image
                    boxSize="40px"
                    // borderRadius="full"
                    alt={artist.name}
                  />
                  {/* Artist Name */}
                  <Text>{artist.name}</Text>
                </HStack>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
