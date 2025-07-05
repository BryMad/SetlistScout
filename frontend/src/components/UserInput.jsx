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
  Flex,
} from "@chakra-ui/react";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import TourDropdown from "./TourDropdown";

/**
 * Component for artist search input
 * - Uses Deezer API for artist search
 * - Uses Spotify API for setlist and playlist functionality
 */
export default function UserInput() {
  const { 
    fetchTourOptions, 
    selectTour,
    analysisLoading, 
    loading, 
    searchForArtistsDeezer,
    tourOptions,
    resetSearch
  } = useSetlist();
  const { clearPlaylistUrl } = useSpotify();
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showTourDropdown, setShowTourDropdown] = useState(false);
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

  // Show tour dropdown when tour options are available
  useEffect(() => {
    if (tourOptions.length > 0) {
      setShowTourDropdown(true);
      setSuggestions([]); // Hide artist suggestions
    }
  }, [tourOptions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
        setShowTourDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Fetches artist suggestions from Deezer
   * @param {string} query The artist search query
   * @async
   */
  const fetchArtistSuggestions = async (query) => {
    try {
      setSearchLoading(true);
      const results = await searchForArtistsDeezer(query);
      setSuggestions(results || []);
    } catch (error) {
      console.error("Error fetching artist suggestions:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Fetches tour options for a selected artist
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
    await fetchTourOptions(artist);
  };

  /**
   * Handles tour selection and processes the setlist data
   * @param {Object} tour The selected tour object
   * @async
   */
  const handleTourSelect = async (tour) => {
    setShowTourDropdown(false);
    await selectTour(tour);
    // Reset the form after successful processing
    setArtistQuery("");
    setSelectedArtist(null);
  };

  /**
   * Handles clicking outside or starting a new search
   */
  const handleReset = () => {
    setShowTourDropdown(false);
    setArtistQuery("");
    setSelectedArtist(null);
    setSuggestions([]);
    resetSearch();
  };

  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      maxWidth="100%"
      mx="auto"
      mb={{ base: 2, md: 0 }}
      alignItems="center"
      justifyContent="center"
    >
      <Text fontWeight="semibold" fontSize="md" mb={3} color="gray.300">
        Enter an Artist to see what they're playing live:
      </Text>

      <Input
        placeholder="Search for an artist..."
        value={artistQuery}
        onChange={(e) => setArtistQuery(e.target.value)}
        size="lg"
        variant="filled"
        bg="gray.800"
        borderRadius="xl"
        width="100%"
        disabled={loading || analysisLoading}
        _hover={{ bg: "gray.700" }}
        _focus={{ bg: "gray.700", borderColor: "brand.400" }}
        transition="all 0.2s"
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
          bg="gray.800"
          mt={2}
          width="100%"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="xl"
          border="1px solid"
          borderColor="gray.700"
        >
          <List spacing={0}>
            {suggestions.map((artist) => (
              <ListItem
                key={artist.id}
                px={4}
                py={3}
                _hover={{ backgroundColor: "gray.700" }}
                transition="background-color 0.2s"
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
                        borderRadius="full"
                        borderRadius={["2px", "2px", "4px"]}
                      />
                      <Text>{artist.name}</Text>
                    </HStack>
                  </Box>
                </Flex>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Tour Dropdown */}
      <TourDropdown
        tourOptions={tourOptions}
        onTourSelect={handleTourSelect}
        isLoading={analysisLoading}
        isVisible={showTourDropdown || analysisLoading}
      />
    </Box>
  );
}
