// frontend/src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { checkSessionStatus } from "../api/authService";

export const AuthContext = createContext(null);

/**
 * Provider component for authentication state
 * - Modified to work with admin service account pattern
 * - Always "logged in" since we use the admin account for all operations
 */
export const AuthProvider = ({ children }) => {
  // Initialize with isLoggedIn: true - we're always "logged in" with service account
  const [authState, setAuthState] = useState({
    isLoggedIn: true,
    userId: "admin",
    isInitialized: false,
  });

  // Maintain sessionRestored for compatibility with existing code
  const [sessionRestored, setSessionRestored] = useState(false);

  // Initialize auth on first load - simplified, but preserved for compatibility
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if admin account is set up
        const { isLoggedIn } = await checkSessionStatus();

        setAuthState({
          // Use the admin status to determine if we're actually "logged in"
          isLoggedIn: isLoggedIn,
          userId: "admin",
          isInitialized: true,
        });

        // Set session restored flag to trigger state restoration
        // This is needed for compatibility with existing code
        setSessionRestored(true);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setAuthState({
          isLoggedIn: false,
          userId: null,
          isInitialized: true,
        });
      }
    };

    initializeAuth();
  }, []);

  // Update auth helper function (simplified but preserved for compatibility)
  const updateAuth = useCallback(async () => {
    try {
      const { isLoggedIn } = await checkSessionStatus();
      setAuthState((prevState) => ({
        ...prevState,
        isLoggedIn,
      }));
    } catch (error) {
      console.error("Error updating auth status:", error);
    }
  }, []);

  // Login helper function (simplified)
  const login = useCallback((stateToSave) => {
    // Just save state if needed - no actual login required
    if (stateToSave) {
      sessionStorage.setItem("concertCramState", JSON.stringify(stateToSave));
    }

    // Force update to isLoggedIn: true if needed
    setAuthState((prevState) => ({
      ...prevState,
      isLoggedIn: true,
    }));

    // Immediately trigger sessionRestored
    setSessionRestored(true);
  }, []);

  // Logout helper function (simplified)
  const logout = useCallback(() => {
    // No actual logout action needed with service account
    console.log("Logout called - no action needed with service account");

    // For compatibility, we could reload the page or do nothing
    // Just maintain the logged in state
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...authState,
      updateAuth,
      login,
      logout,
      sessionRestored,
    }),
    [authState, updateAuth, login, logout, sessionRestored]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
