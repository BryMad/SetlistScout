import axios from 'axios';
import { isMobileDevice } from '../utils/deviceDetection';

// Get the server URL from environment variable
const server_url = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

/**
 * Initiates Spotify login based on device type
 * - For mobile: Saves state to sessionStorage and redirects
 * - For desktop: Opens a popup for authentication
 * 
 * @param {Object} currentState Current app state to save before redirecting
 * @returns {void}
 */
export const initiateSpotifyLogin = (currentState) => {
  if (isMobileDevice()) {
    // Save current state to sessionStorage before redirecting on mobile
    if (currentState) {
      sessionStorage.setItem("concertCramState", JSON.stringify(currentState));
    }

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
 * Sets up an authentication listener for the popup window response
 * 
 * @param {Function} callback Function to call with authentication data
 * @returns {Function} Cleanup function to remove the event listener
 */
export const setupAuthListener = (callback) => {
  const handleMessage = (event) => {
    // Validate origin for security
    if (new URL(event.origin).hostname !== new URL(server_url).hostname) {
      return;
    }

    // Handle auth message format
    if (event.data && event.data.type === "authentication") {
      callback({
        isLoggedIn: event.data.isLoggedIn,
        userId: null // Will be fetched from the status endpoint
      });
    }
  };

  window.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage);
  };
};
export const checkSessionStatus = async () => {
  try {
    const response = await axios.get(`${server_url}/auth/status`, {
      withCredentials: true // Important to include cookies
    });

    return {
      isLoggedIn: response.data.isLoggedIn,
      userId: response.data.userId
    };
  } catch (error) {
    console.error("Error checking session status:", error);
    return { isLoggedIn: false, userId: null };
  }
};
