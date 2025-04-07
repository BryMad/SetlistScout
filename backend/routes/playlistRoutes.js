const express = require('express');
const router = express.Router();
const axios = require('axios');
const ensureAuthenticated = require('../middleware/authMiddleware');

/**
 * Processes tracks in batches for large playlists
 * - Spotify limits adding tracks to 100 per request
 * 
 * @param {string} playlistId Spotify playlist ID
 * @param {string} accessToken Spotify access token
 * @param {Array<string>} trackIds Array of track URIs
 * @returns {Promise<boolean>} Success status
 * @async
 */
async function addTracksInBatches(playlistId, accessToken, trackIds) {
  try {
    // Process tracks in batches of 100 (Spotify API limit)
    const batchSize = 100;
    const batches = [];

    // Split tracks into batches of 100
    for (let i = 0; i < trackIds.length; i += batchSize) {
      batches.push(trackIds.slice(i, i + batchSize));
    }

    console.log(`Adding ${trackIds.length} tracks in ${batches.length} batches of up to ${batchSize} tracks each`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1} of ${batches.length} (${batch.length} tracks)`);

      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: batch,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Add a small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding tracks in batches:', error.response ? error.response.data : error);
    throw error;
  }
}

/**
 * Endpoint: POST /create_playlist
 * Creates a Spotify playlist with selected tracks
 * - Handles large track lists using batch processing
 * - Creates playlist with tour-specific name
 * - Adds tracks to the playlist in batches of 100
 * 
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

    console.log(`Creating playlist with ${track_ids.length} tracks`);

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

    // Add tracks to the playlist in batches
    await addTracksInBatches(playlist_id, access_token, track_ids);

    res.status(200).json({
      message: 'Playlist created successfully',
      playlist_id: playlist_id,
      playlist_url: playlist_url
    });
  } catch (error) {
    console.error('Error creating playlist:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

module.exports = router;