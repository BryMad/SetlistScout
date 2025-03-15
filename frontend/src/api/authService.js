// frontend/src/api/authService.js - CHANGES NEEDED

import axios from 'axios';
import { isMobileDevice } from '../utils/deviceDetection';

// Get the server URL from environment variable
const server_url = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

/**
 * Initiates Spotify login based on device type
 * - Redirects to Spotify login with proper credentials
 * - No longer stores state in sessionStorage (will use server sessions)
 * 
 * @param {Object} currentState Current app state to save before redirecting
 * @returns {void}
 */
export const initiateSpotifyLogin = (currentState) => {
  // Create a stateful redirect with app state
  let loginUrl = `${server_url}/auth/login`;

  // If we have state to preserve, send it with the login request
  if (currentState) {
    // We'll encode the state and send it as a parameter
    loginUrl += `?appState=${encodeURIComponent(JSON.stringify(currentState))}`;
  }

  if (isMobileDevice()) {
    // Direct redirect for mobile
    window.location.href = loginUrl;
  } else {
    // Popup approach for desktop
    const width = 450;
    const height = 730;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    window.open(
      loginUrl,
      "Spotify Login",
      `width=${width},height=${height},top=${top},left=${left}`
    );
  }
};

/**
 * Checks if user is authenticated via API endpoint
 * 
 * @returns {Promise<Object>} Authentication state object { isLoggedIn, userId }
 */
export const checkAuthStatus = async () => {
  try {
    const response = await axios.get(`${server_url}/auth/status`, {
      withCredentials: true // Important to include cookies
    });

    return {
      isLoggedIn: response.data.isLoggedIn,
      userId: response.data.userId
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return {
      isLoggedIn: false,
      userId: null
    };
  }
};

/**
 * Process auth response - simplified to handle session-based auth
 * 
 * @returns {Object} Authentication data or empty object
 */
export const processAuthResponse = () => {
  let authData = { processed: false, userId: null, savedState: null };

  // Handle URL query parameter for success
  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get("auth") === "success";
  const stateParam = urlParams.get("state");

  if (authSuccess) {
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    // If we have state in the URL, parse it
    if (stateParam) {
      try {
        const savedState = JSON.parse(decodeURIComponent(stateParam));
        authData = {
          processed: true,
          userId: null, // We don't need the actual userId here
          savedState
        };
      } catch (error) {
        console.error("Error restoring state:", error);
      }
    } else {
      authData = {
        processed: true,
        userId: null,
        savedState: null
      };
    }
  }

  return authData;
};

/**
 * Logs the user out by making a request to clear the server session
 * 
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await axios.post(`${server_url}/auth/logout`, {}, {
      withCredentials: true // Include cookies
    });

    // No need to clear localStorage anymore

  } catch (error) {
    console.error('Error logging out:', error);
  }
};

/**
 * Sets up an authentication listener for the popup window response
 * Only handles authentication success/failure message, no tokens
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

    // Handle auth message format - now simplified, no tokens
    if (event.data && event.data.type === "authentication") {
      const isLoggedIn = event.data.success === true;
      const userId = event.data.userId;
      const savedState = event.data.state;

      callback({
        isLoggedIn,
        userId,
        savedState
      });
    }
  };

  window.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener("message", handleMessage);
  };
};