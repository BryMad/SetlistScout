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

export default function UserInput({
  userInput,
  setUserInput,
  loading,
  setLoading,
  fetchSetlists,
  server_url,
}) {
  // ! TODO put back into app.jsx??
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // For closing the dropdown when user clicks outside
  const containerRef = useRef(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (artistQuery.length >= 2) {
        fetchArtistSuggestions(artistQuery);
      } else {
        setSuggestions([]); // Clear if too short
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
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

  const handleSelectArtist = (artist) => {
    // For now, just fill the input with the chosen artist's name
    // or do something else like run a separate "get setlist" call
    setArtistQuery(artist.name);
    // Clear suggestions after selection
    setSuggestions([]);
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
    <Box ref={containerRef} position="relative" width="100%">
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
            {suggestions.map((artist, index) => (
              <ListItem
                key={index}
                px={4}
                py={2}
                _hover={{ backgroundColor: "gray.600", cursor: "pointer" }}
                onClick={() => handleSelectArtist(artist)}
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
