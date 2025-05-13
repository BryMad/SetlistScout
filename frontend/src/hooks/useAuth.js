// File: ./frontend/src/hooks/useAuth.js
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getFromLocalStorage } from '../utils/storage';

/**
 * Custom hook for authentication operations
 * - Adds consent check to login flow
 * 
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Get original login function from context
  const { login: originalLogin, ...rest } = authContext;

  // Create new login function that checks for user consent first
  const login = useCallback(
    (stateToSave) => {
      // Check if user has consented to terms and privacy policy
      const hasConsented = getFromLocalStorage("setlistScoutConsent");

      if (!hasConsented) {
        // If no consent, don't proceed with login - the ConsentModal will appear
        console.log("User must accept terms and privacy policy before logging in");
        return;
      }

      // If user has consented, proceed with the original login function
      originalLogin(stateToSave);
    },
    [originalLogin]
  );

  return {
    ...rest,
    login,
  };
};