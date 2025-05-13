// src/hooks/useDeezer.js
import { useState } from "react";

/**
 * Hook for interacting with the Deezer API
 */
export const useDeezer = () => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Clears the current playlist URL
   */
  const clearPlaylistUrl = () => {
    setPlaylistUrl("");
  };

  /**
   * Searches for an artist on Deezer
   * @param {string} query - The search query
   * @returns {Promise<Array>} - Array of artist objects
   */
  const searchForArtists = async (query) => {
    try {
      setLoading(true);
      setError(null);

      // Deezer API doesn't require authentication for basic search
      const response = await fetch(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        throw new Error(`Deezer API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform Deezer data to match your expected format
      return data.data.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: { url: artist.picture_medium },
        url: artist.link
      }));
    } catch (err) {
      console.error("Error searching for artists:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets top tracks for an artist
   * @param {string} artistId - The Deezer artist ID
   * @returns {Promise<Array>} - Array of track objects
   */
  const getArtistTopTracks = async (artistId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=10`);

      if (!response.ok) {
        throw new Error(`Deezer API error: ${response.status}`);
      }

      const data = await response.json();

      return data.data.map(track => ({
        id: track.id,
        name: track.title,
        album: {
          name: track.album.title,
          image: { url: track.album.cover_medium }
        },
        artists: [{ name: track.artist.name }],
        duration_ms: track.duration * 1000, // Deezer uses seconds, convert to ms
        preview_url: track.preview
      }));
    } catch (err) {
      console.error("Error getting artist top tracks:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    playlistUrl,
    setPlaylistUrl,
    clearPlaylistUrl,
    loading,
    error,
    searchForArtists,
    getArtistTopTracks
  };
};