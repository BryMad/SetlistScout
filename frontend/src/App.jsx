import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  ChakraProvider,
  SimpleGrid,
  CloseButton,
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
import UserInput from "./components/UserInput";
import TracksHUD from "./components/TracksHUD";
import Navbar from "./components/Navbar";
import About from "./components/About";
import Contact from "./components/Contact";
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
  const [playlistNotification, setPlaylistNotification] = useState({
    message: "",
    status: "",
  });
  // Active right panel content: "tracks", "about", or "contact"
  const [rightPanelContent, setRightPanelContent] = useState("tracks");
  // Active navigation state to highlight the appropriate button
  const [activeNav, setActiveNav] = useState("tracks");

  // Update both the right panel content and active navigation state
  const handleSetRightPanelContent = useCallback((content) => {
    setRightPanelContent(content);
    setActiveNav(content);
  }, []);

  /**
   * Utility function to check if the current device is mobile.
   * @returns {boolean} True if the device is mobile, false otherwise.
   */
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Added handleLogout function to resolve the error.
  const handleLogout = () => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_user_id");
    setLoggedIn(false);
    setPlaylistNotification({
      message: "Successfully logged out",
      status: "info",
    });
    setTimeout(() => {
      setPlaylistNotification({ message: "", status: "" });
    }, 3000);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("spotify_access_token");
    const storedUserId = localStorage.getItem("spotify_user_id");

    if (storedToken && storedUserId) {
      setLoggedIn(true);
    }

    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const userId = hashParams.get("user_id");
      if (accessToken && userId) {
        console.log("Received auth tokens from URL fragment");
        localStorage.setItem("spotify_access_token", accessToken);
        localStorage.setItem("spotify_user_id", userId);
        setLoggedIn(true);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        const savedState = sessionStorage.getItem("concertCramState");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            setSpotifyData(parsedState.spotifyData || []);
            setTourData(parsedState.tourData || {});
          } catch (error) {
            console.error("Error restoring state:", error);
          }
          sessionStorage.removeItem("concertCramState");
        }
      }
    }

    const handleMessage = (event) => {
      if (new URL(event.origin).hostname !== new URL(server_url).hostname) {
        return;
      }

      if (event.data && event.data.type === "authentication") {
        console.log("Received auth tokens from popup");
        localStorage.setItem("spotify_access_token", event.data.access_token);
        localStorage.setItem("spotify_user_id", event.data.user_id);
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
      const accessToken = localStorage.getItem("spotify_access_token");
      const userId = localStorage.getItem("spotify_user_id");

      if (!accessToken || !userId) {
        console.error("Missing authentication tokens");
        setPlaylistNotification({
          message: "Authentication required. Please log in again.",
          status: "error",
        });
        return;
      }

      const track_ids = spotifyData
        .filter((item) => item.artistName !== undefined)
        .map((item) => item.uri);

      const response = await axios.post(
        `${server_url}/playlist/create_playlist`,
        {
          track_ids: track_ids,
          band: tourData.bandName,
          tour: tourData.tourName,
          access_token: accessToken,
          user_id: userId,
        }
      );

      if (response.status === 200) {
        console.log("Playlist created successfully");
        setPlaylistNotification({
          message: "Playlist created successfully!",
          status: "success",
        });
        setTimeout(() => {
          setPlaylistNotification({ message: "", status: "" });
        }, 5000);
      } else {
        console.error("Failed to create playlist");
        setPlaylistNotification({
          message: "Error creating playlist",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error creating playlist:", error);

      if (error.response?.status === 401) {
        setPlaylistNotification({
          message: "Authentication expired. Please log in again.",
          status: "error",
        });
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_user_id");
        setLoggedIn(false);
      } else {
        setPlaylistNotification({
          message: `Error creating playlist: ${
            error.response?.data?.error || "Please try again"
          }`,
          status: "error",
        });
      }
    }
  };

  const spotifyLogin = () => {
    if (isMobile()) {
      const stateToSave = {
        spotifyData,
        tourData,
      };
      sessionStorage.setItem("concertCramState", JSON.stringify(stateToSave));
      window.location.href = `${server_url}/auth/login`;
    } else {
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
    }
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
          setDisplayError(errorData.error || "An error occurred.");
        }
        return;
      }
      const data = await response.json();
      setSpotifyData(data.spotifySongsOrdered || []);
      setTourData(data.tourData || {});
      setUserInput("");
    } catch (error) {
      console.log("error: ", JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (spotifyDataResults, tourDataResults) => {
    setSpotifyData(spotifyDataResults);
    setTourData(tourDataResults);
    handleSetRightPanelContent("tracks");
  };

  const renderRightPanelContent = () => {
    switch (rightPanelContent) {
      case "about":
        return <About />;
      case "contact":
        return <Contact />;
      case "tracks":
      default:
        return (
          <TracksHUD
            spotifyLogin={spotifyLogin}
            createPlaylist={createPlaylist}
            loggedIn={loggedIn}
            spotifyData={spotifyData}
            tourData={tourData}
            loading={loading}
            playlistNotification={playlistNotification}
          />
        );
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
        <Navbar
          isLoggedIn={loggedIn}
          handleLogout={handleLogout}
          handleLogin={spotifyLogin}
          setRightPanelContent={handleSetRightPanelContent}
          activeNav={activeNav}
        />
        <Container maxW="container.xl" flex="1" p={4}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box p={4}>
              <UserInput
                loading={loading}
                setLoading={setLoading}
                setSpotifyData={handleSearch}
                setTourData={setTourData}
                setDisplayError={setDisplayError}
                setRightPanelContent={handleSetRightPanelContent}
              />
              {displayError && (
                <Alert
                  status="error"
                  mt={4}
                  borderRadius="md"
                  bg="red.800"
                  color="white"
                  position="relative"
                >
                  <AlertIcon />
                  <AlertTitle mr={2}>Error:</AlertTitle>
                  <AlertDescription flex="1">{displayError}</AlertDescription>
                  <CloseButton
                    position="absolute"
                    right="8px"
                    top="8px"
                    onClick={() => setDisplayError(null)}
                  />
                </Alert>
              )}
            </Box>
            <Box p={4}>{renderRightPanelContent()}</Box>
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
