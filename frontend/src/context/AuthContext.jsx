// src/context/AuthContext.jsx - CHANGES NEEDED
import { createContext, useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  checkAuthStatus,
  processAuthResponse,
  setupAuthListener,
  logout as logoutService,
} from "../api/authService";
import { server_url } from "../App";

export const AuthContext = createContext(null);

/**
 * Provider component for authentication state
 * - Manages auth state across the application
 * - Now uses session-based authentication
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
      // First check server session for existing auth
      const { isLoggedIn, userId } = await checkAuthStatus();

      // Then check for URL fragment auth (mobile flow)
      const authResponse = processAuthResponse();

      if (authResponse.processed) {
        setAuthState({
          isLoggedIn: true,
          userId: authResponse.userId || userId,
          isInitialized: true,
          restoredState: authResponse.savedState,
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
    const cleanupListener = setupAuthListener((authData) => {
      setAuthState((prevState) => ({
        ...prevState,
        ...authData,
      }));
    });

    // Cleanup function
    return cleanupListener;
  }, []);

  // Logout handler
  const handleLogout = async () => {
    await logoutService();

    setAuthState((prevState) => ({
      ...prevState,
      isLoggedIn: false,
      userId: null,
    }));
  };

  // Value provided to consumers
  const contextValue = useMemo(
    () => ({
      ...authState,
      updateAuth: (newAuthState) => {
        setAuthState((prevState) => ({
          ...prevState,
          ...newAuthState,
        }));
      },
      logout: handleLogout,
      login: (stateToSave) => logoutService(stateToSave),
    }),
    [authState, handleLogout]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
