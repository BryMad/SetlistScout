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
import { useCombobox } from "downshift";

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
  const [suggestions, setSuggestions] = useState([]); // Artist search API results
  const [displaySuggestions, setDisplaySuggestions] = useState([]); // Artist search results displayed
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0); // 0 = Live Shows, 1 = Past Tours
  const [tours, setTours] = useState([]);
  const [selectedTour, setSelectedTour] = useState("");
  const [toursLoading, setToursLoading] = useState(false);
  const containerRef = useRef(null);
  const [shouldAutoSelect, setShouldAutoSelect] = useState(false);

  // new artist search
  useEffect(() => {
    if (selectedArtist && selectedArtist.name === artistQuery) return;

    // Clear selectedArtist if user is typing a different name
    if (selectedArtist && artistQuery && selectedArtist.name !== artistQuery) {
      setSelectedArtist(null);
      setTours([]);
      setSelectedTour("");
    }

    const debounceTimeout = setTimeout(() => {
      if (artistQuery.length >= 1) {
        fetchArtistSuggestions(artistQuery);
      } else {
        setSuggestions([]);
        setDisplaySuggestions([]);
      }
    }, 500); // Increased debounce to reduce API rate limiting

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

  // Add useEffect to auto-select top suggestion when loading finishes
  useEffect(() => {
    if (shouldAutoSelect && !searchLoading && suggestions.length > 0) {
      handleArtistSelect(suggestions[0]); // Select the first (top) suggestion
      setShouldAutoSelect(false); // Reset the flag
    }
  }, [shouldAutoSelect, searchLoading, suggestions]);

  /**
   * Fetches artist suggestions from Deezer
   * @param {string} query The artist search query
   * @async
   */
  const fetchArtistSuggestions = async (query) => {
    try {
      setSearchLoading(true);
      // Don't clear displaySuggestions - keep showing previous results while loading
      const results = await searchForArtistsDeezer(query);
      setSuggestions(results || []);
      setDisplaySuggestions(results || []);
    } catch (error) {
      console.error("Error fetching artist suggestions:", error);
      // On error, don't change displaySuggestions
    } finally {
      setSearchLoading(false);
    }
  };

  /**
   * Fetches tour options for a selected artist (non-SSE version)
   * @param {Object} artist The selected artist object
   * @async
   */
  const fetchTours = async (artist) => {
    if (!artist) return;

    setToursLoading(true);
    setTours([]);

    try {
      console.log("Fetching tours for:", artist.name);

      // Make simple fetch request to the new non-SSE endpoint
      const response = await fetch(
        `${server_url}/setlist/artist/${encodeURIComponent(artist.name)}/tours`,
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
              popularity: artist.popularity,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(
          "Tour fetch request failed:",
          response.status,
          response.statusText
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Tour fetch response:", data);

      if (data.tours && Array.isArray(data.tours)) {
        // Sort tours by year (newest first) then by show count
        const sortedTours = data.tours.sort((a, b) => {
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

        console.log("Setting tours:", sortedTours.length, "tours found");
        setTours(sortedTours);
      } else {
        console.error("Invalid response format:", data);
        setTours([]);
      }
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
      console.error("Tour not found or no selected artist", {
        tour,
        selectedArtist,
      });
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
    setDisplaySuggestions([]);
    setTours([]);
    setSelectedTour("");
    resetSearch();
  };

  const renderArtistInput = () => {
    const {
      isOpen,
      getInputProps,
      getMenuProps,
      getItemProps,
      highlightedIndex,
    } = useCombobox({
      items: displaySuggestions,
      itemToString: (item) => item?.name || "",
      inputValue: artistQuery,
      onInputValueChange: ({ inputValue }) => {
        setArtistQuery(inputValue);
      },
      onSelectedItemChange: ({ selectedItem }) => {
        if (selectedItem) {
          handleArtistSelect(selectedItem);
        }
      },
    });

    return (
      <Box position="relative" width="100%">
        <Input
          {...getInputProps({
            placeholder: "Search for an artist...",
            size: "lg",
            variant: "filled",
            bg: "gray.800",
            borderRadius: "xl",
            disabled: loading || toursLoading,
            _hover: { bg: "gray.700" },
            _focus: { bg: "gray.700", borderColor: "brand.400" },
            transition: "all 0.2s",
            onKeyDown: (event) => {
              if (event.key === "Enter") {
                if (highlightedIndex === -1 && artistQuery.trim() !== "") {
                  event.preventDefault();
                  if (!searchLoading && suggestions.length > 0) {
                    // If already loaded, select top immediately
                    handleArtistSelect(suggestions[0]);
                  } else {
                    // If loading or no suggestions yet, set flag to auto-select when ready
                    setShouldAutoSelect(true);
                  }
                }
                // Downshift handles Enter for highlighted items
              }
            },
          })}
        />

        <Box
          {...getMenuProps()}
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt={0}
          bg="gray.800"
          borderRadius="0 0 1rem 1rem"
          zIndex="10"
          overflow="hidden"
          boxShadow="xl"
          border="1px solid"
          borderColor="gray.700"
          borderTop="none"
          display={isOpen && artistQuery.length > 0 ? "block" : "none"}
        >
          {searchLoading && (
            <Flex
              justify="center"
              p={3}
              bg="gray.750"
              borderBottom="1px solid"
              borderBottomColor="gray.700"
            >
              <Spinner size="sm" />
              <Text as="span" ml={2} color="gray.300">
                Searching...
              </Text>
            </Flex>
          )}

          {displaySuggestions.length > 0 ? (
            <List spacing={0}>
              {displaySuggestions.map((artist, index) => (
                <ListItem
                  key={artist.id}
                  {...getItemProps({ item: artist, index })}
                  px={4}
                  py={3}
                  bg={highlightedIndex === index ? "gray.700" : "transparent"}
                  _hover={{ bg: "gray.700" }}
                  transition="background-color 0.2s"
                >
                  <HStack spacing={3}>
                    <Image
                      src={artist.image?.url || "https://placehold.co/40"}
                      boxSize="40px"
                      alt={artist.name}
                      borderRadius="full"
                    />
                    <Text color="white">{artist.name}</Text>
                  </HStack>
                </ListItem>
              ))}
            </List>
          ) : (
            !searchLoading && (
              <Flex justify="center" p={3}>
                <Text color="gray.400" fontSize="sm">
                  No artists found
                </Text>
              </Flex>
            )
          )}
        </Box>
      </Box>
    );
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
          <TabList justifyContent="center" gap={8}>
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
                },
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
              Basic Search
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
                },
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
                {renderArtistInput()}
              </VStack>
            </TabPanel>

            {/* Past Tours Tab */}
            <TabPanel px={0}>
              <VStack spacing={3}>
                <Text fontWeight="semibold" fontSize="md" color="gray.300">
                  Enter an Artist to see what they played on past tours:
                </Text>
                {renderArtistInput()}
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
          {renderArtistInput()}
        </VStack>
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
            <Box textAlign="center" py={4}>
              <HStack justify="center">
                <Spinner size="sm" color="brand.400" />
                <Text color="gray.300">Loading tours...</Text>
              </HStack>
              <Text size="2xs" color="gray.400">
                (warning: this can take a while)
              </Text>
            </Box>
          )}

          {/* Tours list - show when tours are available */}
          {tours.length > 0 && (
            <List spacing={0}>
              {console.log(
                "Rendering dropdown with",
                tours.length,
                "tours:",
                tours.map((t) => t.name)
              )}
              {tours.map((tour) => (
                <ListItem
                  key={tour.name + "_" + tour.year}
                  px={4}
                  py={3}
                  _hover={{ backgroundColor: "gray.700" }}
                  transition="background-color 0.2s"
                  cursor="pointer"
                  onClick={() => handleTourSelect(tour.name, tour)}
                >
                  <Text>
                    {tour.displayName || tour.name} - {tour.showCount} show
                    {tour.showCount !== 1 ? "s" : ""}
                  </Text>
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
