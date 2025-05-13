// src/api/deezerService.js
import axios from 'axios';
import { server_url } from '../App';

/**
 * Search for artists on Deezer
 * 
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of artist objects
 */
export const searchDeezerArtists = async (query) => {
  try {
    const response = await axios.post(
      `${server_url}/setlist/artist_search_deezer`,
      { artistName: query },
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (error) {
    console.error("Error searching for artists on Deezer:", error);
    throw error;
  }
};