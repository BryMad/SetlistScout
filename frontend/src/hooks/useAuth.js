// src/hooks/useAuth.js
import { useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { initiateSpotifyLogin } from '../api/authService';

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
  const { isLoggedIn, userId, isInitialized, login, logout } = authContext;

  return {
    isLoggedIn,
    userId,
    isInitialized,
    login,
    logout
  };
};