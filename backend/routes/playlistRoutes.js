// backend/routes/playlistRoutes.js - COMPLETE FILE
const express = require('express');
const router = express.Router();
const axios = require('axios');
const ensureAuthenticated = require('../middleware/authMiddleware');
const authRoutes = require('./authRoutes');
const refreshAccessToken = authRoutes.refreshAccessToken;

/**
 * Endpoint: POST /create_playlist
 * Creates a Spotify playlist with selected tracks
 * - Now uses session for authentication
 * - No longer accepts tokens in request body
 * 
 * @param {Array<string>} req.body.track_ids Spotify track URIs
 * @param {string} req.body.band Band name
 * @param {string} req.body.tour Tour name
 * @returns {Object} Success message and playlist ID
 */
router.post('/create_playlist', ensureAuthenticated, async (req, res) => {
  try {
    // Get access token and user ID from session only
    const access_token = req.session.access_token;
    const refresh_token = req.session.refresh_token;
    const user_id = req.session.user_id;
    const track_ids = req.body.track_ids;
    const band = req.body.band;
    const tour = req.body.tour;

    if (!access_token || !user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Function to execute the playlist creation with the given token
    const createPlaylistWithToken = async (token) => {
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
            Authorization: `Bearer ${token}`,
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
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return playlist_id;
    };

    try {
      // Try with the current token
      const playlist_id = await createPlaylistWithToken(access_token);
      res.status(200).json({
        message: 'Playlist created successfully',
        playlist_id
      });
    } catch (error) {
      // If we get a 401, try to refresh the token
      if (error.response && error.response.status === 401 && refresh_token) {
        const tokens = await refreshAccessToken(refresh_token);

        if (tokens) {
          // Update the session with new tokens
          req.session.access_token = tokens.access_token;
          if (tokens.refresh_token) {
            req.session.refresh_token = tokens.refresh_token;
          }

          // Try again with the new token
          try {
            const playlist_id = await createPlaylistWithToken(tokens.access_token);
            res.status(200).json({
              message: 'Playlist created successfully',
              playlist_id
            });
          } catch (retryError) {
            throw retryError;
          }
        } else {
          throw new Error('Failed to refresh access token');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error creating playlist:', error.response ? error.response.data : error);

    // If authentication fails, log the user out
    if (error.response && error.response.status === 401) {
      // Clear the session
      req.session.access_token = null;
      req.session.refresh_token = null;
      req.session.user_id = null;

      return res.status(401).json({
        error: 'Authentication failed. Please log in again.',
        authError: true
      });
    }

    res.status(500).json({
      error: 'Failed to create playlist',
      message: error.message
    });
  }
});

module.exports = router;