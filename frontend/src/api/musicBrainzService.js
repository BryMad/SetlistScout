// src/api/musicBrainzService.js
import axios from 'axios';
import { server_url } from '../App';

/**
 * Search for artists on MusicBrainz with fanart.tv images
 * 
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of artist objects with MusicBrainz data and fanart.tv images
 */
export const searchMusicBrainzArtists = async (query) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search_musicbrainz`,
      { artistName: query },
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (error) {
    console.error("Error searching for artists on MusicBrainz:", error);
    throw error;
  }
};
