const express = require('express');
const router = express.Router();
const qs = require('qs');
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

// TODO move to Utils
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
  const scope = 'playlist-modify-public';
  // Store state in session for verification
  req.session.state = state;
  // debug
  // console.log("/LOGIN");
  console.log(querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    show_dialog: true
  }))
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
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.session.state || null;

    if (state === null || state !== storedState) {
      console.log('it was REDIRECT 45');

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
    console.log('it was REDIRECT 64');
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers: headers });

    if (tokenResponse.status === 200) {
      const access_token = tokenResponse.data.access_token;
      const refresh_token = tokenResponse.data.refresh_token;

      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;

      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      req.session.user_id = userResponse.data.id;
      console.log('User ID:', req.session.user_id);
      console.log('it was REDIRECT 78');
      // Redirect to frontend 
      res.send(`<!DOCTYPE html>
<html>
<body>
<script>
  window.opener.postMessage('authenticated', 'https://setlistscout.onrender.com');
  window.close();
</script>
</body>
</html>`);
    } else {
      console.log('it was REDIRECT 88');
      res.redirect('/error?error=invalid_token');
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    console.log('it was REDIRECT 96');

    res.redirect('/error?error=exception');
  }
});

module.exports = router;
