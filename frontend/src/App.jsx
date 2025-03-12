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
  // Add state to track which content to show in the right panel
  const [rightPanelContent, setRightPanelContent] = useState("tracks");

  // Update the right panel content
  const handleSetRightPanelContent = useCallback((content) => {
    setRightPanelContent(content);
  }, []);

  /**
   * Utility function to check if the current device is mobile
   * @returns {boolean} True if the device is mobile, false otherwise
   */
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  /**
   * Effect hook to check for authentication tokens on initial load and URL changes
   * - Checks localStorage for existing tokens
   * - Handles authentication via URL fragments (mobile flow)
   * - Sets up event listener for authentication via popup (desktop flow)
   */
  useEffect(() => {
    // Check localStorage for existing tokens
    const storedToken = localStorage.getItem("spotify_access_token");
    const storedUserId = localStorage.getItem("spotify_user_id");

    if (storedToken && storedUserId) {
      setLoggedIn(true);
    }

    // Check URL for auth parameters and URL fragments
    const params = new URLSearchParams(window.location.search);

    // Handle URL fragment (for mobile flow with tokens)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(
        window.location.hash.substring(1) // Remove the # character
      );
      const accessToken = hashParams.get("access_token");
      const userId = hashParams.get("user_id");
      if (accessToken && userId) {
        console.log("Received auth tokens from URL fragment");
        localStorage.setItem("spotify_access_token", accessToken);
        localStorage.setItem("spotify_user_id", userId);
        setLoggedIn(true);

        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Restore previous state from sessionStorage
        const savedState = sessionStorage.getItem("concertCramState");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            setSpotifyData(parsedState.spotifyData || []);
            setTourData(parsedState.tourData || {});
          } catch (error) {
            console.error("Error restoring state:", error);
          }
          // Clear storage after restoring
          sessionStorage.removeItem("concertCramState");
        }
      }
    }

    // Event listener for authentication via popup (desktop flow)
    const handleMessage = (event) => {
      // Validate origin for security
      if (new URL(event.origin).hostname !== new URL(server_url).hostname) {
        return;
      }

      // Handle new token-based message format
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

  /**
   * Creates a Spotify playlist using the fetched setlist data
   * - Uses stored authentication tokens
   * - Filters out songs without Spotify data
   * - Handles success and error notifications
   * @async
   */
  const createPlaylist = async () => {
    try {
      // Get tokens from localStorage
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

      // filter songs that didn't return spotify data
      const track_ids = spotifyData
        .filter((item) => item.artistName !== undefined)
        .map((item) => item.uri);

      // Send POST request to backend with tokens
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
        // Set success notification
        setPlaylistNotification({
          message: "Playlist created successfully!",
          status: "success",
        });

        // Clear notification after 5 seconds
        setTimeout(() => {
          setPlaylistNotification({ message: "", status: "" });
        }, 5000);
      } else {
        console.error("Failed to create playlist");
        // Set error notification
        setPlaylistNotification({
          message: "Error creating playlist",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error creating playlist:", error);

      // Check for auth errors specifically
      if (error.response?.status === 401) {
        setPlaylistNotification({
          message: "Authentication expired. Please log in again.",
          status: "error",
        });
        // Clear tokens and logged in state
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_user_id");
        setLoggedIn(false);
      } else {
        // Set error notification with more details if available
        setPlaylistNotification({
          message: `Error creating playlist: ${
            error.response?.data?.error || "Please try again"
          }`,
          status: "error",
        });
      }
    }
  };

  /**
   * Initiates Spotify login process based on device type
   * - For mobile: Saves state to sessionStorage and redirects
   * - For desktop: Opens a popup for authentication
   */
  const spotifyLogin = () => {
    if (isMobile()) {
      // Save current state to sessionStorage before redirecting on mobile
      const stateToSave = {
        spotifyData,
        tourData,
      };
      sessionStorage.setItem("concertCramState", JSON.stringify(stateToSave));

      // Redirect to Spotify login
      window.location.href = `${server_url}/auth/login`;
    } else {
      // Desktop popup approach
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

  /**
   * Handles user logout
   * - Removes stored tokens
   * - Updates logged in state
   */
  const handleLogout = () => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_user_id");
    setLoggedIn(false);

    // Set notification about logout
    setPlaylistNotification({
      message: "Successfully logged out",
      status: "info",
    });

    // Clear notification after 3 seconds
    setTimeout(() => {
      setPlaylistNotification({ message: "", status: "" });
    }, 3000);
  };

  /**
   * Fetches setlist data from the server
   * - Extracts setlist ID from user input
   * - Handles loading state and errors
   * - Updates state with fetched data
   * @async
   */
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

  // When a search happens, we want to show the tracks
  const handleSearch = (spotifyDataResults, tourDataResults) => {
    setSpotifyData(spotifyDataResults);
    setTourData(tourDataResults);
    setRightPanelContent("tracks"); // Switch to tracks view when a search happens
  };

  // Render the right panel content based on the rightPanelContent state
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
