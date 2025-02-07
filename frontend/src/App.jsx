import { useEffect, useState } from "react";
import {
  Input,
  Flex,
  Box,
  Button,
  Container,
  Grid,
  ChakraProvider,
  SimpleGrid,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import theme from "./theme";
import "./App.css";
import axios from "axios";
import Track from "./components/Track";
import UserInput from "./components/UserInput";
import TracksHUD from "./components/TracksHUD";
import { extractSetlistID } from "./utils/setlistHelpers";

export const server_url =
  import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

function App() {
  const [userInput, setUserInput] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [spotifyData, setSpotifyData] = useState([]);
  const [tourData, setTourData] = useState({});
  const [displayError, setDisplayError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Event listener for login status in popup window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== server_url) return;
      if (event.data === "authenticated") {
        setLoggedIn(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const createPlaylist = async () => {
    try {
      // filter songs that didn't return spotify data
      const track_ids = spotifyData
        .filter((item) => item.artistName !== undefined)
        .map((item) => item.uri);

      // Send POST request to backend
      const response = await axios.post(
        `${server_url}/playlist/create_playlist`,
        {
          track_ids: track_ids,
          band: tourData.bandName,
          tour: tourData.tourName,
        },
        {
          withCredentials: true, // Include this if you're using cookies/sessions
        }
      );

      if (response.status === 200) {
        console.log("Playlist created successfully");
      } else {
        console.error("Failed to create playlist");
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const spotifyLogin = () => {
    const width = 450;
    const height = 730;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    const url = `${server_url}/auth/login`;

    window.open(
      url,
      "Spotify Login",
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const fetchSetlists = async () => {
    setLoading(true);
    setDisplayError(null);
    try {
      const response = await fetch(`${server_url}/setlist`, {
        method: "post",
        cors: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listID: extractSetlistID(userInput) }),
      });
      if (response.status === 400) {
        setDisplayError(
          "Please find a different setlist with tour information"
        );
        console.log("response: ", response);
        throw new Error("data not found");
      }
      const data = await response.json();

      setSpotifyData(data.spotifySongsOrdered || []);
      setTourData(data.tourData || []);
      setUserInput("");
      console.log(data.spotifySongsOrdered);
      console.log(data.tourData);
    } catch (error) {
      console.log("error: ", JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Box bg="gray.900" color="white" minH="100vh" p={4}>
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box p={4}>
              <UserInput
                userInput={userInput}
                setUserInput={setUserInput}
                loading={loading}
                fetchSetlists={fetchSetlists}
              />
              {displayError && (
                <Alert status="error" mt={4} borderRadius="md">
                  <AlertIcon />
                  <AlertTitle mr={2}>Error:</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              )}
            </Box>
            <Box p={4}>
              <TracksHUD
                spotifyLogin={spotifyLogin}
                createPlaylist={createPlaylist}
                loggedIn={loggedIn}
                spotifyData={spotifyData}
                tourData={tourData}
                loading={loading}
              />
            </Box>
          </SimpleGrid>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
