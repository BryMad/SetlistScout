// frontend/src/api/authService.js
import { server_url } from '../App';

/**
 * Authentication service for service account pattern
 * - Checks if admin account is set up
 * - No user login is required
 */

/**
 * Checks if admin Spotify account is properly configured
 * 
 * @returns {Promise<Object>} Admin status { isSetup, message }
 */
export const checkAdminStatus = async () => {
  try {
    const response = await fetch(`${server_url}/admin/status`, {
      method: 'GET',
      credentials: 'include'
    });

    return await response.json();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { isSetup: false, error: error.message };
  }
};

/**
 * Checks session status - now checks admin setup status instead
 * Maintained for compatibility with existing code
 * 
 * @returns {Promise<Object>} Auth status { isLoggedIn, userId }
 */
export const checkSessionStatus = async () => {
  try {
    // Check admin status instead of user session
    const adminStatus = await checkAdminStatus();

    // Return same format as original function for compatibility
    return {
      isLoggedIn: adminStatus.isSetup,
      userId: 'admin' // Use placeholder value
    };
  } catch (error) {
    console.error('Error checking session status:', error);
    return { isLoggedIn: false, userId: null };
  }
};

/**
 * Initiates Spotify login - now a no-op function
 * Maintained for compatibility with existing code
 * 
 * @param {Object} [currentState] State to save before login
 * @returns {boolean} Always returns true
 */
export const initiateSpotifyLogin = (currentState) => {
  console.log('User login not needed with service account pattern');

  // If state provided, save it to sessionStorage for compatibility
  if (currentState) {
    sessionStorage.setItem("concertCramState", JSON.stringify(currentState));
  }

  return true;
};

/**
 * Sets up authentication listener - now a no-op function
 * Maintained for compatibility with existing code
 * 
 * @param {Function} callback Function to call on authentication
 * @returns {Function} Cleanup function
 */
export const setupAuthListener = (callback) => {
  // No listener needed with service account pattern
  console.log('Auth listener not needed with service account pattern');

  // Call callback immediately to simulate successful auth
  if (callback && typeof callback === 'function') {
    setTimeout(() => {
      callback({
        isLoggedIn: true,
        userId: 'admin'
      });
    }, 100);
  }

  // Return dummy cleanup function
  return () => { };
};