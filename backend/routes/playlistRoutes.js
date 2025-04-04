const express = require('express');
const router = express.Router();
const axios = require('axios');
const ensureAuthenticated = require('../middleware/authMiddleware');

/**
 * Endpoint: POST /create_playlist
 * Creates a Spotify playlist with selected tracks
 * - Accepts auth tokens via body or session
 * - Creates playlist with tour-specific name
 * - Adds tracks to the playlist
 * 
 * @param {Object} req.body.access_token Spotify access token
 * @param {Object} req.body.user_id Spotify user ID
 * @param {Array<string>} req.body.track_ids Spotify track URIs
 * @param {string} req.body.band Band name
 * @param {string} req.body.tour Tour name
 * @returns {Object} Success message and playlist ID
 */
router.post('/create_playlist', ensureAuthenticated, async (req, res) => {
  try {
    // Get access token and user ID from session
    const access_token = req.session.access_token;
    const user_id = req.session.user_id;
    const track_ids = req.body.track_ids;
    const band = req.body.band;
    const tour = req.body.tour;

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
    const playlist_url = createPlaylistResponse.data.external_urls.spotify;

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

    res.status(200).json({
      message: 'Playlist created successfully',
      playlist_id: playlist_id,
      playlist_url: playlist_url  // Return the playlist URL
    });
  } catch (error) {
    console.error('Error creating playlist:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

module.exports = router;