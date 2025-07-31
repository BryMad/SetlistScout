// src/components/UserInput.jsx
import React, { useEffect, useState, useRef } from "react";
import { CloseIcon } from "@chakra-ui/icons";
import {
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Tooltip,
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
import eventSourceService from "../api/sseService";

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
  const [tourLoadingProgress, setTourLoadingProgress] = useState("");
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

  // Cleanup will be handled by the SSE service

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
   * Fetches tour options for a selected artist using SSE for live updates
   * @param {Object} artist The selected artist object
   * @async
   */
  const fetchTours = async (artist) => {
    if (!artist) return;

    setToursLoading(true);
    setTours([]);
    setTourLoadingProgress("Connecting...");
    
    try {
      // Connect to SSE using existing service
      console.log('Connecting to SSE service...');
      await eventSourceService.connect();
      const clientId = eventSourceService.getClientId();
      
      if (!clientId) {
        throw new Error("Failed to establish SSE connection");
      }
      
      console.log('Got clientId:', clientId);
      
      const tourMap = new Map();
      const listenerId = `tour-fetch-${Date.now()}`;
      
      // Set up listener for SSE events
      eventSourceService.addListener(listenerId, (event) => {
        console.log('Received SSE event:', event);
        
        if (event.type === 'update') {
          switch (event.stage) {
            case 'page_progress':
              setTourLoadingProgress(event.message || "Loading...");
              break;
              
            case 'tour_discovered':
            case 'tour_updated':
              console.log('Tour event received:', event);
              if (event.data?.tour) {
                const tour = event.data.tour;
                console.log('Adding tour to map:', tour);
                tourMap.set(tour.name, tour);
                
                // Update tours array with all tours, sorted by year (newest first)
                const sortedTours = Array.from(tourMap.values())
                  .sort((a, b) => {
                    // Extract first year from display year (e.g., "2023" or "2019-2021")
                    const getFirstYear = (yearStr) => {
                      if (!yearStr) return 0;
                      const match = yearStr.match(/\d{4}/);
                      return match ? parseInt(match[0]) : 0;
                    };
                    
                    const yearA = getFirstYear(b.year);
                    const yearB = getFirstYear(a.year);
                    
                    if (yearA !== yearB) return yearA - yearB;
                    return b.showCount - a.showCount;
                  });
                
                console.log('Updating tours state with:', sortedTours.length, 'tours');
                setTours([...sortedTours]);
              }
              break;
              
            case 'tour_search_complete':
              setToursLoading(false);
              setTourLoadingProgress("");
              eventSourceService.removeListener(listenerId);
              break;
          }
        } else if (event.type === 'error') {
          console.error('SSE Error:', event.message);
          setToursLoading(false);
          setTourLoadingProgress("");
          eventSourceService.removeListener(listenerId);
        }
      });
      
      // Start the tour streaming
      console.log('Starting tour streaming for:', artist.name);
      const response = await fetch(
        `${server_url}/setlist/artist/${encodeURIComponent(artist.name)}/tours_stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artist: {
              name: artist.name,
              id: artist.id,
              url: artist.url,
              image: artist.image,
              popularity: artist.popularity
            },
            clientId
          })
        }
      );

      if (!response.ok) {
        console.error('Tour streaming request failed:', response.status, response.statusText);
        eventSourceService.removeListener(listenerId);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('Tour streaming request successful');
      
    } catch (error) {
      console.error("Error fetching tours:", error);
      setTours([]);
      setToursLoading(false);
      setTourLoadingProgress("");
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
      // Keep the artist name but don't trigger new search
      setArtistQuery(artist.name);
    }
  };

  /**
   * Handles tour selection in advanced search
   * @param {string} tourName The selected tour name
   */
  const handleTourSelect = async (tourName, selectedTourObject = null) => {
    console.log("handleTourSelect called with tourName:", tourName);
    console.log("Available tours:", tours);
    console.log("Selected tour object:", selectedTourObject);
    
    // Use the passed tour object if available, otherwise find it
    let tour = selectedTourObject;
    if (!tour) {
      tour = tours.find((t) => t.name === tourName);
    }
    console.log("Final tour:", tour);
    
    if (!tour || !selectedArtist) {
      console.error("Tour not found or no selected artist", { tour, selectedArtist });
      return;
    }

    // Set the selected tour to show in dropdown
    setSelectedTour(tourName);

    // Dispatch an event to notify that a new search is starting
    window.dispatchEvent(new Event("new-search-started"));

    // Clear the playlist URL when a new tour is selected
    if (clearPlaylistUrl) {
      clearPlaylistUrl();
    }

    console.log("Selected tour:", tour);
    console.log("For artist:", selectedArtist);
    console.log("About to call fetchTourData with:");
    console.log("  - Artist:", selectedArtist.name);
    console.log("  - Tour name:", tour.name);
    console.log("  - Tour display name:", tour.displayName);

    // Fetch setlist data for the specific tour
    await fetchSpecificTourData(selectedArtist, null, tour.name);

    // Reset the form after selection
    setArtistQuery("");
    setSelectedArtist(null);
    setTours([]);
    setSelectedTour("");
    setToursLoading(false);
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

  /**
   * Cancels the current search operation
   */
  const handleCancelSearch = async () => {
    const clientId = eventSourceService.getClientId();
    if (clientId) {
      try {
        const response = await fetch(`${server_url}/setlist/cancel/${clientId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          console.log('Search cancelled successfully');
          // Reset UI state
          eventSourceService.disconnect();
          resetSearch();
          setArtistQuery("");
        }
      } catch (error) {
        console.error('Error cancelling search:', error);
      }
    }
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

              <InputGroup size="lg">
                <Input
                  placeholder="Search for an artist..."
                  value={artistQuery}
                  onChange={(e) => setArtistQuery(e.target.value)}
                  variant="filled"
                  bg="gray.800"
                  borderRadius="xl"
                  width="100%"
                  disabled={loading}
                  _hover={{ bg: "gray.700" }}
                  _focus={{ bg: "gray.700", borderColor: "brand.400" }}
                  transition="all 0.2s"
                />
                {loading && (
                  <InputRightElement>
                    <Tooltip label="Cancel current search" placement="left">
                      <IconButton
                        aria-label="Cancel search"
                        icon={<CloseIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="gray"
                        onClick={handleCancelSearch}
                        _hover={{ bg: "gray.600" }}
                      />
                    </Tooltip>
                  </InputRightElement>
                )}
              </InputGroup>

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

              <InputGroup size="lg">
                <Input
                  placeholder="Search for an artist..."
                  value={artistQuery}
                  onChange={(e) => setArtistQuery(e.target.value)}
                  variant="filled"
                  bg="gray.800"
                  borderRadius="xl"
                  width="100%"
                  disabled={loading || toursLoading}
                  _hover={{ bg: "gray.700" }}
                  _focus={{ bg: "gray.700", borderColor: "brand.400" }}
                  transition="all 0.2s"
                />
                {(loading || toursLoading) && (
                  <InputRightElement>
                    <Tooltip label="Cancel current search" placement="left">
                      <IconButton
                        aria-label="Cancel search"
                        icon={<CloseIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="gray"
                        onClick={handleCancelSearch}
                        _hover={{ bg: "gray.600" }}
                      />
                    </Tooltip>
                  </InputRightElement>
                )}
              </InputGroup>

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
        </TabPanels>
      </Tabs>
      ) : (
        /* No tabs - just show the live shows search */
        <VStack spacing={3}>
          <Text fontWeight="semibold" fontSize="md" color="gray.300">
            Enter an Artist to see what they're playing live:
          </Text>

          <InputGroup size="lg">
            <Input
              placeholder="Search for an artist..."
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              variant="filled"
              bg="gray.800"
              borderRadius="xl"
              width="100%"
              disabled={loading}
              _hover={{ bg: "gray.700" }}
              _focus={{ bg: "gray.700", borderColor: "brand.400" }}
              transition="all 0.2s"
            />
            {loading && (
              <InputRightElement>
                <Tooltip label="Cancel current search" placement="left">
                  <IconButton
                    aria-label="Cancel search"
                    icon={<CloseIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={handleCancelSearch}
                    _hover={{ bg: "gray.600" }}
                  />
                </Tooltip>
              </InputRightElement>
            )}
          </InputGroup>

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

      {/* Artist suggestions dropdown - shown for both tabs (but not when artist is selected in Past Tours) */}
      {suggestions.length > 0 && !(selectedArtist && tabIndex === 1) && (
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

      {/* Tour dropdown - shown immediately after artist selection in Past Tours tab */}
      {selectedArtist && tabIndex === 1 && !selectedTour && (
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
          {/* Loading indicator - show when loading */}
          {toursLoading && (
            <Box textAlign="center" py={4} borderBottom={tours.length > 0 ? "1px solid" : "none"} borderColor="gray.700">
              <VStack spacing={2}>
                <HStack>
                  <Spinner size="sm" color="brand.400" />
                  <Text color="gray.300">
                    {tourLoadingProgress || "Loading tours..."}
                  </Text>
                </HStack>
                {tours.length > 0 && (
                  <Text fontSize="sm" color="gray.500">
                    {tours.length} tour{tours.length !== 1 ? 's' : ''} found so far...
                  </Text>
                )}
              </VStack>
            </Box>
          )}
          
          {/* Tours list - show when tours are available */}
          {tours.length > 0 && (
            <List spacing={0}>
              {console.log('Rendering dropdown with', tours.length, 'tours:', tours.map(t => t.name))}
              {tours.map((tour) => (
                <ListItem
                  key={tour.name + '_' + tour.year}
                  px={4}
                  py={3}
                  _hover={{ backgroundColor: "gray.700" }}
                  transition="background-color 0.2s"
                  cursor="pointer"
                  onClick={() => handleTourSelect(tour.name, tour)}
                >
                  <Text>{tour.displayName || tour.name} - {tour.showCount} show{tour.showCount !== 1 ? 's' : ''}</Text>
                </ListItem>
              ))}
            </List>
          )}
          
          {/* No tours message - show only when not loading and no tours found */}
          {!toursLoading && tours.length === 0 && (
            <Box textAlign="center" py={4}>
              <Text color="gray.400">No tours found for this artist</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
