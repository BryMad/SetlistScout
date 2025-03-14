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
 * Checks if user is authenticated by checking localStorage tokens
 * 
 * @returns {Object} Authentication state object { isLoggedIn, userId, accessToken }
 */
export const checkAuthStatus = () => {
  const accessToken = localStorage.getItem("spotify_access_token");
  const userId = localStorage.getItem("spotify_user_id");

  return {
    isLoggedIn: !!(accessToken && userId),
    userId,
    accessToken
  };
};

export const processAuthResponse = () => {
  let authData = { processed: false, accessToken: null, userId: null, savedState: null };

  // Handle URL fragment (for mobile flow with tokens)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1) // Remove the # character
    );
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const userId = hashParams.get("user_id");

    if (accessToken && userId) {
      localStorage.setItem("spotify_access_token", accessToken);
      localStorage.setItem("spotify_user_id", userId);

      // Store refresh token if available
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken);
      }

      // Store timestamp for expiration checking
      localStorage.setItem("spotify_token_timestamp", Date.now().toString());

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Restore previous state from sessionStorage
      const savedStateStr = sessionStorage.getItem("concertCramState");
      let savedState = null;

      if (savedStateStr) {
        try {
          savedState = JSON.parse(savedStateStr);
          // Clear storage after getting value
          sessionStorage.removeItem("concertCramState");
        } catch (error) {
          console.error("Error restoring state:", error);
        }
      }

      authData = {
        processed: true,
        accessToken,
        userId,
        savedState
      };
    }
  }

  return authData;
};

/**
 * Refreshes the access token using the refresh token
 * 
 * @returns {Promise<Object>} New tokens or null if refresh failed
 */
export const refreshAccessToken = async () => {
  try {
    const refresh_token = localStorage.getItem("spotify_refresh_token");

    if (!refresh_token) {
      return null;
    }

    const response = await axios.post(
      `${server_url}/auth/refresh`,
      { refresh_token },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.access_token) {
      // Save the new tokens
      localStorage.setItem("spotify_access_token", response.data.access_token);

      // Save new refresh token if provided
      if (response.data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", response.data.refresh_token);
      }

      return response.data;
    }

    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

/**
 * Checks if the stored token needs refreshing
 * 
 * @returns {boolean} True if token is expired or close to expiry
 */
export const isTokenExpired = () => {
  const tokenTimestamp = localStorage.getItem("spotify_token_timestamp");

  if (!tokenTimestamp) {
    return true;
  }

  // Tokens typically expire after 3600 seconds (1 hour)
  // Refresh when less than 5 minutes remaining
  const EXPIRATION_TIME = 3600 * 1000; // 1 hour in milliseconds
  const BUFFER_TIME = 300 * 1000; // 5 minutes in milliseconds
  const now = Date.now();

  return now - parseInt(tokenTimestamp) > EXPIRATION_TIME - BUFFER_TIME;
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
      const accessToken = event.data.access_token;
      const refreshToken = event.data.refresh_token;
      const userId = event.data.user_id;

      localStorage.setItem("spotify_access_token", accessToken);
      localStorage.setItem("spotify_user_id", userId);

      // Store refresh token if available
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken);
      }

      // Store timestamp for expiration checking
      localStorage.setItem("spotify_token_timestamp", Date.now().toString());

      callback({
        isLoggedIn: true,
        accessToken,
        userId
      });
    }
  };

  window.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage);
  };
};

/**
 * Logs the user out by removing authentication tokens
 * 
 * @returns {void}
 */
export const logout = () => {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_user_id");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_timestamp");
};