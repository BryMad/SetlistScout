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
 * - Generates state parameter and stores in session
 * - Redirects to Spotify authorization URL
 */
router.get('/login', (req, res) => {
  const state = generateRandomString(16);
  console.log('login state:', state);
  const scope = 'playlist-modify-public';
  // Store state in session for verification
  req.session.state = state;

  console.log("STRINGIFY:====");
  console.log(querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    show_dialog: true
  }));

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
 * - Verifies state to prevent CSRF
 * - Exchanges authorization code for access token
 * - Fetches user information
 * - Handles different flows for mobile vs desktop
 */
router.get('/callback', async (req, res) => {
  try {
    console.log('Host header:', req.headers.host);
    const code = req.query.code || null;
    const state = req.query.state || null;
    console.log('code:', code);
    console.log('callback state:', state);
    const storedState = req.session.state || null;
    console.log("storedState: ", storedState);
    console.log("state: ", state);

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

    console.log('Requesting token from Spotify');
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers: headers });

    if (tokenResponse.status === 200) {
      const access_token = tokenResponse.data.access_token;
      const refresh_token = tokenResponse.data.refresh_token;

      // Get user information
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const user_id = userResponse.data.id;
      console.log('User ID:', user_id);

      // Still store in session for backward compatibility
      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;
      req.session.user_id = user_id;

      const frontEndURL = process.env.NODE_ENV === 'production'
        ? 'https://setlistscout.onrender.com'
        : 'http://localhost:5173';

      // Detect if user is on mobile
      const userAgent = req.headers['user-agent'];
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      // In the callback route:
      if (isMobile) {
        // For mobile, redirect with tokens in URL fragment
        console.log('Mobile detected, redirecting with tokens in fragment');
        // Use # fragment to prevent tokens from being sent to server in subsequent requests
        res.redirect(`${frontEndURL}?auth=success#loginStatus=success`);
      } else {
        // For desktop, use the popup message approach but send tokens
        console.log('Desktop detected, sending tokens via postMessage');
        res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  window.opener.postMessage({
    type: 'authentication',
    // ! TODO DELETE access and refresh tokens from URL, add a boolean
    access_token: '${access_token}',
    refresh_token: '${refresh_token}',
    isLoggedIn: true
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
 * Endpoint: POST /refresh
 * Refreshes an expired access token using the refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }

    const data = qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64')
    };

    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

    if (tokenResponse.status === 200) {
      // Sometimes Spotify doesn't return a new refresh token
      const new_access_token = tokenResponse.data.access_token;
      const new_refresh_token = tokenResponse.data.refresh_token || refresh_token;

      // Update session if it exists
      if (req.session) {
        req.session.access_token = new_access_token;
        req.session.refresh_token = new_refresh_token;
      }

      return res.json({
        access_token: new_access_token,
        refresh_token: new_refresh_token
      });
    } else {
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', (req, res) => {
  const isLoggedIn = !!(req.session && req.session.access_token && req.session.user_id);

  res.json({
    isLoggedIn,
    userId: isLoggedIn ? req.session.user_id : null
  });
});

router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to log out' });
      }

      res.clearCookie('connect.sid'); // Clear the session cookie
      return res.json({ success: true });
    });
  } else {
    return res.json({ success: true });
  }
});
module.exports = router;