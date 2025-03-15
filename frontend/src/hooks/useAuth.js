// src/hooks/useAuth.js - CHANGES NEEDED
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { initiateSpotifyLogin, logout as logoutService } from '../api/authService';

/**
 * Custom hook for authentication operations
 * - Modified for session-based auth
 * 
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Get state from context
  const { isLoggedIn, userId, restoredState } = authContext;

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
  const handleLogout = useCallback(async () => {
    await logoutService();

    authContext.updateAuth({
      isLoggedIn: false,
      userId: null
    });
  }, [authContext]);

  return {
    isLoggedIn,
    userId,
    restoredState,
    login,
    logout: handleLogout
  };
};