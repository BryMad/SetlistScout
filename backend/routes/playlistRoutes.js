const express = require('express');
const router = express.Router();
const axios = require('axios');
const ensureAuthenticated = require('../middleware/authMiddleware');

// POST /create_playlist
router.post('/create_playlist', async (req, res) => {
  try {
    // Get access token and user ID from request body or session
    const access_token = req.body.access_token || req.session?.access_token;
    const user_id = req.body.user_id || req.session?.user_id;
    const track_ids = req.body.track_ids;
    const band = req.body.band;
    const tour = req.body.tour;

    if (!access_token || !user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Create a new playlist
    const createPlaylistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${user_id}/playlists`,
      {
        name: `${band} - ${tour} songs`,
        description: 'Created by SetlistScout',
        public: true,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const playlist_id = createPlaylistResponse.data.id;

    // Add tracks to the playlist
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
      {
        uris: track_ids,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({ message: 'Playlist created successfully', playlist_id: playlist_id });
  } catch (error) {
    console.error('Error creating playlist:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

module.exports = router;