// backend/routes/authRoutes.js - COMPLETE FILE
const express = require('express');
const router = express.Router();
const qs = require('qs');
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

/**
 * Generates a random string for state parameter
 * Used to prevent CSRF attacks in OAuth flow
 * 
 * @param {number} length Length of the random string
 * @returns {string} Random hexadecimal string
 */
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Endpoint: GET /login
 * Initiates Spotify OAuth flow
 * - Now also captures app state to restore after login
 */
router.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'playlist-modify-public';

  // Store state in session for verification
  req.session.state = state;

  // Store app state in session if provided
  if (req.query.appState) {
    try {
      req.session.appState = req.query.appState;
    } catch (error) {
      console.error('Error storing app state:', error);
    }
  }

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

/**
 * Endpoint: GET /callback
 * Handles Spotify OAuth callback
 * - No longer returns tokens to the frontend
 * - Only sends success/failure status
 */
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.session.state || null;
    const appState = req.session.appState || null;

    if (state === null || state !== storedState) {
      console.log('State mismatch error');
      return res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    }

    // Clear state
    req.session.state = null;

    const data = qs.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

    if (tokenResponse.status === 200) {
      const access_token = tokenResponse.data.access_token;
      const refresh_token = tokenResponse.data.refresh_token;

      // Get user information
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const user_id = userResponse.data.id;

      // Store tokens and user ID in session
      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;
      req.session.user_id = user_id;

      const frontEndURL = process.env.NODE_ENV === 'production'
        ? 'https://setlistscout.onrender.com'
        : 'http://localhost:5173';

      // Detect if user is on mobile
      const userAgent = req.headers['user-agent'];
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      // Return app state if we have it
      const stateParam = appState ? `&state=${encodeURIComponent(appState)}` : '';

      if (isMobile) {
        // For mobile, redirect with success flag only (no tokens)
        res.redirect(`${frontEndURL}?auth=success${stateParam}`);
      } else {
        // For desktop, use the popup message approach but only send status (no tokens)
        res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  window.opener.postMessage({
    type: 'authentication',
    success: true,
    userId: '${user_id}',
    state: ${appState ? appState : 'null'}
  }, '${frontEndURL}');
  window.close();
</script>
</body>
</html>`);
      }
    } else {
      res.redirect('/error?error=invalid_token');
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.redirect('/error?error=exception');
  }
});

/**
 * Endpoint: GET /status
 * Checks if user is authenticated
 */
router.get('/status', (req, res) => {
  const isLoggedIn = !!(req.session && req.session.access_token && req.session.user_id);

  res.json({
    isLoggedIn,
    userId: isLoggedIn ? req.session.user_id : null
  });
});

/**
 * Endpoint: POST /logout
 * Logs the user out by clearing their session
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to log out' });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      return res.json({ success: true });
    });
  } else {
    return res.json({ success: true });
  }
});

/**
 * Internal method to refresh token - no longer exposed to frontend
 * Now used by apiClient interceptor on the backend
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

    if (tokenResponse.status === 200) {
      return {
        access_token: tokenResponse.data.access_token,
        refresh_token: tokenResponse.data.refresh_token || refreshToken
      };
    }
    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Export both the router and refreshAccessToken, but make router the default export
router.refreshAccessToken = refreshAccessToken;
module.exports = router;