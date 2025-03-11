const express = require('express');
const router = express.Router();
const qs = require('qs');
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

// Generate a random string for state parameter
const generateRandomString = (length) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

// Load environment variables
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

// Spotify Login route
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

// Spotify Callback route
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

      if (isMobile) {
        // For mobile, redirect with tokens in URL fragment
        console.log('Mobile detected, redirecting with tokens in fragment');
        // Use # fragment to prevent tokens from being sent to server in subsequent requests
        res.redirect(`${frontEndURL}?auth=success#access_token=${access_token}&user_id=${user_id}`);
      } else {
        // For desktop, use the popup message approach but send tokens
        console.log('Desktop detected, sending tokens via postMessage');
        res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  window.opener.postMessage({
    type: 'authentication',
    access_token: '${access_token}',
    user_id: '${user_id}'
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

module.exports = router;