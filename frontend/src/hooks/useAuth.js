// src/hooks/useAuth.js
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { initiateSpotifyLogin, logout } from '../api/authService';

/**
 * Custom hook for authentication operations
 * 
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Get state from context
  const { isLoggedIn, userId, accessToken, restoredState } = authContext;

  /**
   * Log into Spotify
   * 
   * @param {Object} [stateToSave] State to save before redirecting
   */
  const login = useCallback((stateToSave) => {
    initiateSpotifyLogin(stateToSave);
  }, []);

  /**
   * Log out of Spotify
   */
  const handleLogout = useCallback(() => {
    logout();
    authContext.updateAuth({
      isLoggedIn: false,
      userId: null,
      accessToken: null
    });
  }, [authContext]);

  return {
    isLoggedIn,
    userId,
    accessToken,
    restoredState,
    login,
    logout: handleLogout
  };
};