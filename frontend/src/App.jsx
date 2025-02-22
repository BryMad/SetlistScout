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
  Link,
  Text,
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
        return;
      }
      const data = await response.json();

      setSpotifyData(data.spotifySongsOrdered || []);
      setTourData(data.tourData || []);
      setUserInput("");
    } catch (error) {
      console.log("error: ", JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Box
        bg="gray.900"
        color="white"
        display="flex"
        flexDirection="column"
        minH="100vh"
      >
        <Container maxW="container.xl" flex="1" p={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box p={4}>
              <UserInput
                userInput={userInput}
                setUserInput={setUserInput}
                loading={loading}
                setLoading={setLoading}
                fetchSetlists={fetchSetlists}
                setSpotifyData={setSpotifyData}
                setTourData={setTourData}
                setDisplayError={setDisplayError}
              />
              {displayError && (
                <Alert
                  status="error"
                  mt={4}
                  borderRadius="md"
                  bg="red.800"
                  color="white"
                >
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

        <Box as="footer" textAlign="center" fontSize="sm" opacity={0.8} p={4}>
          <Text>
            This app uses the Spotify API but is not endorsed, certified, or
            otherwise approved by Spotify. Spotify is a registered trademark of
            Spotify AB.
          </Text>
          <Text>
            Please see{" "}
            <Link
              href="https://developer.spotify.com/policy"
              color="blue.300"
              isExternal
            >
              Spotify Developer Policy
            </Link>{" "}
            and{" "}
            <Link
              href="https://developer.spotify.com/documentation/design"
              color="blue.300"
              isExternal
            >
              Brand Guidelines
            </Link>{" "}
            for more info.
          </Text>
        </Box>
      </Box>
    </ChakraProvider>
  );
}

export default App;
