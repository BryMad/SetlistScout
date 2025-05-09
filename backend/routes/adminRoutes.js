
const express = require('express');
const router = express.Router();
const querystring = require('querystring');
const crypto = require('crypto');

/**
 * Routes for admin-only operations
 * - Admin setup process 
 * - Credential management
 */

/**
 * Generates a random string for state parameter
 * 
 * @param {number} length Length of the random string
 * @returns {string} Random string
 */
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Endpoint: GET /status
 * Checks if admin is already set up
 */
router.get('/status', async (req, res) => {
  try {
    const adminAuth = req.app.locals.adminAuth;
    const isSetup = await adminAuth.isSetup();

    res.json({
      isSetup,
      message: isSetup ? 'Admin account is set up' : 'Admin setup required'
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
});

/**
 * Endpoint: GET /setup
 * Initiates the admin setup process
 */
router.get('/setup', async (req, res) => {
  try {
    const adminAuth = req.app.locals.adminAuth;

    // Check if already set up
    const isSetup = await adminAuth.isSetup();
    if (isSetup) {
      return res.status(400).json({
        error: 'Admin already set up',
        message: 'To reset, use the /admin/reset endpoint first'
      });
    }

    // Generate state for CSRF protection
    const state = generateRandomString(16);
    req.session.adminState = state;

    // Set up auth URL with necessary scopes for playlist creation
    const scope = 'playlist-modify-public playlist-modify-private';
    const authUrl = 'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.CLIENT_ID,
        scope: scope,
        redirect_uri: process.env.REDIRECT_URI,
        state: state,
        show_dialog: true
      });

    res.json({
      authUrl,
      message: 'Please visit this URL to authorize Spotify access for admin account'
    });
  } catch (error) {
    console.error('Error initiating admin setup:', error);
    res.status(500).json({ error: 'Failed to initiate admin setup' });
  }
});

/**
 * Endpoint: GET /callback
 * Handles the callback from Spotify OAuth flow for admin
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.session.adminState;

    // Validate state to prevent CSRF
    if (!state || state !== storedState) {
      return res.status(400).json({ error: 'State mismatch' });
    }

    // Clear state from session
    req.session.adminState = null;

    const adminAuth = req.app.locals.adminAuth;
    await adminAuth.handleAuthorizationCode(code);

    res.json({
      success: true,
      message: 'Admin setup complete! You can now close this window.'
    });
  } catch (error) {
    console.error('Error in admin callback:', error);
    res.status(500).json({ error: 'Failed to complete admin setup' });
  }
});

/**
 * Endpoint: POST /reset
 * Resets admin credentials
 * Requires admin password for security
 */
router.post('/reset', async (req, res) => {
  try {
    const { adminPassword } = req.body;

    // Check admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const adminAuth = req.app.locals.adminAuth;
    await adminAuth.clearCredentials();

    res.json({
      success: true,
      message: 'Admin credentials reset. Please run setup again.'
    });
  } catch (error) {
    console.error('Error resetting admin credentials:', error);
    res.status(500).json({ error: 'Failed to reset admin credentials' });
  }
});

module.exports = router;