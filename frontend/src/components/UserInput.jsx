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
} from "@chakra-ui/react";
import { server_url } from "../App";

export default function UserInput({
  loading,
  setLoading,
  setSpotifyData,
  setTourData,
  setDisplayError,
  setRightPanelContent, // Prop to update the right panel view
}) {
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

  const fetchArtistSuggestions = async (query) => {
    try {
      setSearchLoading(true);
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
      setSearchLoading(false);
    }
  };

  const fetchTour = async (artist) => {
    setArtistQuery(artist.name);
    setSuggestions([]);
    setSelectedArtist(artist);

    // Immediately switch to the TrackHUD view and update active navigation.
    if (setRightPanelContent) {
      setRightPanelContent("tracks");
    }

    try {
      setLoading(true);
      const response = await fetch(`${server_url}/setlist/`, {
        method: "post",
        cors: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artist: { name: artist.name, spotifyId: artist.id, url: artist.url },
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          setDisplayError(
            "Too many requests. Setlist.fm is rate-limiting us. Please try again later."
          );
        } else {
          setDisplayError(errorData.error || "An error occurred.");
        }
        return;
      }
      const data = await response.json();
      setSpotifyData(data.spotifySongsOrdered || [], data.tourData || []);
      setArtistQuery("");
      setSelectedArtist(null);
    } catch (error) {
      console.error("Error fetching setlists:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      ref={containerRef}
      position="relative"
      width="100%"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontWeight="bold" mb={2}>
        Search for an Artist to get their tour info:
      </Text>
      <Input
        placeholder="Type an artist name"
        value={artistQuery}
        onChange={(e) => setArtistQuery(e.target.value)}
        size="lg"
        variant="outline"
      />
      {searchLoading && (
        <Box mt={2}>
          <Spinner size="sm" />
          <Text as="span" ml={2}>
            Searching...
          </Text>
        </Box>
      )}
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
                  <Image
                    src={artist.image?.url || "https://placehold.co/40"}
                    boxSize="40px"
                    alt={artist.name}
                  />
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
