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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
} from "@chakra-ui/react";
import { useSetlist } from "../hooks/useSetlist";
import { useSpotify } from "../hooks/useSpotify";
import { server_url } from "../App";
import { FEATURES } from "../config/features";

/**
 * Component for artist search input
 * - Uses Deezer API for artist search
 * - Uses Spotify API for setlist and playlist functionality
 */
export default function UserInput() {
  const {
    fetchTourData,
    fetchSpecificTourData,
    loading,
    searchForArtistsDeezer,
    resetSearch,
  } = useSetlist();
  const { clearPlaylistUrl } = useSpotify();
  const [artistQuery, setArtistQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0); // 0 = Live Shows, 1 = Past Tours
  const [tours, setTours] = useState([]);
  const [selectedTour, setSelectedTour] = useState("");
  const [toursLoading, setToursLoading] = useState(false);
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
  const fetchTours = async (artist) => {
    if (!artist) return;

    setToursLoading(true);
    try {
      const response = await fetch(
        `${server_url}/setlist/artist/${encodeURIComponent(artist.name)}/tours`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTours(data.tours || []);
    } catch (error) {
      console.error("Error fetching tours:", error);
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  };

  /**
   * Handles artist selection for both Live Shows and Past Tours
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

    if (!FEATURES.ADVANCED_SEARCH || tabIndex === 0) {
      // Live Shows tab OR feature disabled - Original flow: directly process the most recent tour
      await fetchTourData(artist);
      // Reset the form
      setArtistQuery("");
      setSelectedArtist(null);
    } else {
      // Past Tours tab - Fetch tours for selection
      await fetchTours(artist);
    }
  };

  /**
   * Handles tour selection in advanced search
   * @param {string} tourId The selected tour ID
   */
  const handleTourSelect = async (tourId) => {
    const tour = tours.find((t) => t.id === tourId);
    if (!tour || !selectedArtist) return;

    // Set the selected tour to show in dropdown
    setSelectedTour(tourId);

    // Dispatch an event to notify that a new search is starting
    window.dispatchEvent(new Event("new-search-started"));

    // Clear the playlist URL when a new tour is selected
    if (clearPlaylistUrl) {
      clearPlaylistUrl();
    }

    console.log("Selected tour:", tour);
    console.log("For artist:", selectedArtist);

    // Fetch setlist data for the specific tour
    await fetchSpecificTourData(selectedArtist, tourId, tour.name);

    // Reset the form after selection
    setArtistQuery("");
    setSelectedArtist(null);
    setTours([]);
    setSelectedTour("");
  };

  /**
   * Handles clicking outside or starting a new search
   */
  const handleReset = () => {
    setArtistQuery("");
    setSelectedArtist(null);
    setSuggestions([]);
    setTours([]);
    setSelectedTour("");
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
      {FEATURES.ADVANCED_SEARCH ? (
        <Tabs index={tabIndex} onChange={setTabIndex} variant="unstyled" mb={4}>
        <TabList
          justifyContent="center"
          gap={8}
        >
          <Tab
            _selected={{
              color: "brand.300",
              _after: {
                content: '""',
                position: "absolute",
                bottom: "-2px",
                left: "0",
                right: "0",
                height: "2px",
                bg: "brand.300",
              }
            }}
            _hover={{ color: "brand.400" }}
            _open={{ animation: "fadeIn 0.2s ease-in-out" }}
            _close={{ animation: "fadeOut 0.2s ease-in-out" }}
            fontWeight="medium"
            fontSize="sm"
            color="gray.400"
            pb={3}
            px={2}
            bg="transparent"
            border="none"
            borderRadius="0"
            transition="all 0.3s ease"
            position="relative"
            minW="auto"
            w="auto"
          >
            Recent Tour
          </Tab>
          <Tab
            _selected={{
              color: "brand.300",
              _after: {
                content: '""',
                position: "absolute",
                bottom: "-2px",
                left: "0",
                right: "0",
                height: "2px",
                bg: "brand.300",
              }
            }}
            _hover={{ color: "brand.400" }}
            _open={{ animation: "fadeIn 0.2s ease-in-out" }}
            _close={{ animation: "fadeOut 0.2s ease-in-out" }}
            fontWeight="medium"
            fontSize="sm"
            color="gray.400"
            pb={3}
            px={2}
            bg="transparent"
            border="none"
            borderRadius="0"
            transition="all 0.3s ease"
            position="relative"
            minW="auto"
            w="auto"
          >
            Past Tours
          </Tab>
        </TabList>

        <TabPanels>
          {/* Live Shows Tab */}
          <TabPanel px={0}>
            <VStack spacing={3}>
              <Text fontWeight="semibold" fontSize="md" color="gray.300">
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
                disabled={loading}
                _hover={{ bg: "gray.700" }}
                _focus={{ bg: "gray.700", borderColor: "brand.400" }}
                transition="all 0.2s"
              />

              {searchLoading && (
                <Box>
                  <Spinner size="sm" />
                  <Text as="span" ml={2}>
                    Searching...
                  </Text>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* Past Tours Tab */}
          <TabPanel px={0}>
            <VStack spacing={3}>
              <Text fontWeight="semibold" fontSize="md" color="gray.300">
                Enter an Artist to see what they played live:
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
                disabled={loading || toursLoading}
                _hover={{ bg: "gray.700" }}
                _focus={{ bg: "gray.700", borderColor: "brand.400" }}
                transition="all 0.2s"
              />

              {searchLoading && (
                <Box>
                  <Spinner size="sm" />
                  <Text as="span" ml={2}>
                    Searching...
                  </Text>
                </Box>
              )}

              {/* Tour Selection Dropdown */}
              {selectedArtist && tabIndex === 1 && (
                <Box width="100%">
                  {toursLoading ? (
                    <Box textAlign="center" py={4}>
                      <Spinner size="sm" />
                      <Text ml={2} as="span">
                        Loading past tours...
                      </Text>
                    </Box>
                  ) : tours.length > 0 ? (
                    <Menu>
                      <MenuButton
                        as={Button}
                        width="100%"
                        size="lg"
                        variant="filled"
                        bg="gray.800"
                        borderRadius="xl"
                        _hover={{ bg: "gray.700" }}
                        _active={{ bg: "gray.700", borderColor: "brand.400" }}
                        textAlign="left"
                        fontWeight="normal"
                        rightIcon={<Text fontSize="xs">▼</Text>}
                        isDisabled={loading}
                      >
                        {selectedTour ? tours.find(t => t.id === selectedTour)?.name + ` (${tours.find(t => t.id === selectedTour)?.showCount} shows)` : "Select a tour..."}
                      </MenuButton>
                      <MenuList
                        bg="gray.800"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="gray.700"
                        boxShadow="xl"
                        maxH="300px"
                        overflowY="auto"
                      >
                        {tours.map((tour) => (
                          <MenuItem
                            key={tour.id}
                            onClick={() => handleTourSelect(tour.id)}
                            _hover={{ bg: "gray.700" }}
                            transition="background-color 0.2s"
                          >
                            {tour.name} ({tour.showCount} shows)
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  ) : (
                    <Text color="gray.400" textAlign="center">
                      No tours found for this artist
                    </Text>
                  )}
                </Box>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      ) : (
        /* No tabs - just show the live shows search */
        <VStack spacing={3}>
          <Text fontWeight="semibold" fontSize="md" color="gray.300">
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
            disabled={loading}
            _hover={{ bg: "gray.700" }}
            _focus={{ bg: "gray.700", borderColor: "brand.400" }}
            transition="all 0.2s"
          />

          {searchLoading && (
            <Box>
              <Spinner size="sm" />
              <Text as="span" ml={2}>
                Searching...
              </Text>
            </Box>
          )}
        </VStack>
      )}

      {/* Artist suggestions dropdown - shown for both tabs */}
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
    </Box>
  );
}
