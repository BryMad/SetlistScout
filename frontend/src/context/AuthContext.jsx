// src/context/AuthContext.jsx
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import {
  initiateSpotifyLogin,
  checkSessionStatus,
  setupAuthListener,
} from "../api/authService";
import { server_url } from "../App";

export const AuthContext = createContext(null);

/**
 * Provider component for authentication state
 * - Manages auth state across the application
 * - Handles auth flow initialization and callbacks
 */
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    userId: null,
    isInitialized: false,
  });

  // Initialize auth on first load
  useEffect(() => {
    const initializeAuth = async () => {
      // Check server-side session status
      const { isLoggedIn, userId } = await checkSessionStatus();

      // Check for URL fragment auth (mobile flow)
      const hasLoginSuccess = window.location.hash.includes(
        "loginStatus=success"
      );

      if (hasLoginSuccess) {
        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Recheck session status after redirect
        const updatedStatus = await checkSessionStatus();

        setAuthState({
          isLoggedIn: updatedStatus.isLoggedIn,
          userId: updatedStatus.userId,
          isInitialized: true,
        });
      } else {
        setAuthState({
          isLoggedIn,
          userId,
          isInitialized: true,
        });
      }
    };

    initializeAuth();

    // Setup listener for popup auth flow (desktop)
    const cleanupListener = setupAuthListener(async () => {
      console.log("Auth message received, checking status with server...");

      // More aggressive checking: retry multiple times with delay
      // This helps if the server needs time to save the session
      let attempts = 0;
      const maxAttempts = 3;
      let isAuthenticated = false;

      while (attempts < maxAttempts && !isAuthenticated) {
        attempts++;
        console.log(`Auth status check attempt ${attempts}`);

        // When auth message received, verify with server
        const { isLoggedIn, userId } = await checkSessionStatus();
        console.log("Auth status:", isLoggedIn, userId);

        if (isLoggedIn) {
          isAuthenticated = true;
          setAuthState((prevState) => ({
            ...prevState,
            isLoggedIn,
            userId,
          }));
        } else if (attempts < maxAttempts) {
          // Wait before trying again
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!isAuthenticated) {
        console.warn("Failed to verify authentication after multiple attempts");
      }
    });

    // Cleanup function
    return cleanupListener;
  }, []);

  // Update auth helper function
  const updateAuth = useCallback(async () => {
    const { isLoggedIn, userId } = await checkSessionStatus();
    setAuthState((prevState) => ({
      ...prevState,
      isLoggedIn,
      userId,
    }));
  }, []);

  // Login helper function
  const login = useCallback((stateToSave) => {
    // Save state if needed
    if (stateToSave) {
      sessionStorage.setItem("concertCramState", JSON.stringify(stateToSave));
    }
    initiateSpotifyLogin();
  }, []);

  // Logout helper function
  const logout = useCallback(async () => {
    try {
      // Call server logout endpoint
      await axios.post(
        `${server_url}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Error logging out:", error);
    }

    setAuthState((prevState) => ({
      ...prevState,
      isLoggedIn: false,
      userId: null,
    }));
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...authState,
      updateAuth,
      login,
      logout,
    }),
    [authState, updateAuth, login, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
