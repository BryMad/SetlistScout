// src/components/UserInput.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  HStack,
  Input,
  Image,
  Box,
  List,
  ListItem,
  Text,
  Spinner,
  Link,
  Flex,
} from "@chakra-ui/react";
import { FaSpotify } from "react-icons/fa";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";

/**
 * Component for artist search input
 */
export default function UserInput() {
  const { fetchTourData, loading, searchForArtists } = useSetlist();
  const { clearPlaylistUrl } = useSpotify(); // Get the clearPlaylistUrl function
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedArtist && selectedArtist.name === artistQuery) return;

    const debounceTimeout = setTimeout(() => {
      if (artistQuery.length >= 1) {
        fetchArtistSuggestions(artistQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [artistQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Fetches artist suggestions
   * @param {string} query The artist search query
   * @async
   */
  const fetchArtistSuggestions = async (query) => {
    try {
      setSearchLoading(true);
      const results = await searchForArtists(query);
      setSuggestions(results || []);
    } catch (error) {
      console.error("Error fetching artist suggestions:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Fetches tour information for a selected artist
   * @param {Object} artist The selected artist object
   * @async
   */
  const handleArtistSelect = async (artist) => {
    // Dispatch an event to notify that a new search is starting
    window.dispatchEvent(new Event("new-search-started"));

    // Clear the playlist URL when a new artist is selected
    if (clearPlaylistUrl) {
      clearPlaylistUrl();
    }

    setArtistQuery(artist.name);
    setSuggestions([]);
    setSelectedArtist(artist);
    await fetchTourData(artist);
    // Reset the form
    setArtistQuery("");
    setSelectedArtist(null);
  };

  /**
   * Handles clicking on the Spotify icon
   * @param {Event} e The click event
   */
  const handleSpotifyIconClick = (e) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
  };

  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      maxWidth="100%"
      mx="auto"
      mb={{ base: 4, md: 0 }}
      alignItems="center"
      justifyContent="center"
    >
      <Text fontWeight="bold" fontSize="sm" mb={2}>
        Enter an Artist to see what they're playing live:
      </Text>

      <Input
        placeholder="artist name"
        value={artistQuery}
        onChange={(e) => setArtistQuery(e.target.value)}
        size="lg"
        variant="outline"
        width="100%"
        disabled={loading}
      />

      {searchLoading && (
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
                _hover={{ backgroundColor: "gray.600" }}
              >
                <Flex width="100%" justify="space-between" align="center">
                  <Box
                    onClick={() => handleArtistSelect(artist)}
                    flex="1"
                    _hover={{ cursor: "pointer" }}
                  >
                    <HStack spacing={3}>
                      <Image
                        src={artist.image?.url || "https://placehold.co/40"}
                        boxSize="40px"
                        alt={artist.name}
                        borderRadius={["2px", "2px", "4px"]}
                      />
                      <Text>{artist.name}</Text>
                    </HStack>
                  </Box>
                  <Link
                    href={artist.url}
                    isExternal
                    onClick={handleSpotifyIconClick}
                    p={2}
                    color="#1DB954"
                    _hover={{ color: "#1AA34A" }}
                    aria-label={`Open ${artist.name} on Spotify`}
                  >
                    <FaSpotify size={20} />
                  </Link>
                </Flex>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
