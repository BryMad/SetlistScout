// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import {
  checkAuthStatus,
  processAuthResponse,
  setupAuthListener,
} from "../api/authService";

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
    accessToken: null,
    isInitialized: false,
  });

  // Initialize auth on first load
  useEffect(() => {
    // First check localStorage for existing auth
    const { isLoggedIn, userId, accessToken } = checkAuthStatus();

    // Then check for URL fragment auth (mobile flow)
    const authResponse = processAuthResponse();

    if (authResponse.processed) {
      setAuthState({
        isLoggedIn: true,
        userId: authResponse.userId,
        accessToken: authResponse.accessToken,
        isInitialized: true,
        restoredState: authResponse.savedState,
      });
    } else {
      setAuthState({
        isLoggedIn,
        userId,
        accessToken,
        isInitialized: true,
      });
    }

    // Setup listener for popup auth flow (desktop)
    const cleanupListener = setupAuthListener((authData) => {
      setAuthState((prevState) => ({
        ...prevState,
        ...authData,
      }));
    });

    // Cleanup function
    return cleanupListener;
  }, []);

  // Value provided to consumers
  const contextValue = {
    ...authState,
    updateAuth: (newAuthState) => {
      setAuthState((prevState) => ({
        ...prevState,
        ...newAuthState,
      }));
    },
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
