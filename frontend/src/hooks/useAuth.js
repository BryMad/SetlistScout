// File: ./frontend/src/hooks/useAuth.js
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getFromLocalStorage } from '../utils/storage';
import { useToast } from '@chakra-ui/react';

/**
 * Custom hook for authentication operations
 * - Adds consent check to login flow
 * - Provides toast notifications for user feedback
 * - Integrates with the central AuthContext for state management
 * 
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const authContext = useContext(AuthContext);
  const toast = useToast();

  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Get all properties from the auth context
  const {
    login: originalLogin,
    logout: originalLogout,
    isLoggedIn,
    userId,
    isInitialized,
    sessionRestored,
    updateAuth
  } = authContext;

  // Enhanced login function that checks for user consent first
  const login = useCallback(
    (stateToSave) => {
      // Check if user has consented to terms and privacy policy
      const hasConsented = getFromLocalStorage("setlistScoutConsent");

      if (!hasConsented) {
        // If no consent, don't proceed with login
        toast({
          title: "Consent Required",
          description: "You must accept our Terms and Privacy Policy before logging in",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // If user has consented, proceed with the original login function
      originalLogin(stateToSave);
    },
    [originalLogin, toast]
  );

  // Enhanced logout function with success feedback
  const logout = useCallback(() => {
    originalLogout();

    // Provide feedback to the user
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }, [originalLogout, toast]);

  return {
    // Pass through the state properties
    isLoggedIn,
    userId,
    isInitialized,
    sessionRestored,

    // Include enhanced methods
    login,
    logout,
    updateAuth
  };
};