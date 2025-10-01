/**
 * Utility functions for TracksHUD component
 */

/**
 * Format date from DD-MM-YYYY to readable format
 * @param {string} dateStr Date in DD-MM-YYYY format
 * @returns {string} Formatted date like "Sep 26, 2024"
 */
export const formatShowDate = (dateStr) => {
  if (!dateStr) return "Unknown Date";

  try {
    const [day, month, year] = dateStr.split("-");
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateStr; // Return original if parsing fails
  }
};

/**
 * Format show display text for dropdown
 * @param {Object} show Show object with date, venue, city
 * @returns {string} Formatted display like "Sep 26, 2024 - Madison Square Garden, New York"
 */
export const formatShowDisplay = (show) => {
  const date = formatShowDate(show.date);
  const venue = show.venue || "Unknown Venue";
  const city = show.city || "Unknown City";

  return `${date} - ${venue}, ${city}`;
};

/**
 * Process show songs with Spotify data from track map
 * @param {Array} showSongs Array of songs from individual show
 * @param {Function} getSpotifyTrack Function to get Spotify track data
 * @returns {Array} Array of songs with Spotify data
 */
export const processShowTracks = (showSongs, getSpotifyTrack) => {
  if (!showSongs || !Array.isArray(showSongs)) return [];

  return showSongs.map((song, index) => {
    const spotifyTrack = getSpotifyTrack(song.name, song.artist);

    if (spotifyTrack) {
      // Return track with original show order
      return {
        ...spotifyTrack,
        showOrder: index + 1, // Track position in show
        isCover: song.isCover,
      };
    } else {
      // Create placeholder for songs not found on Spotify
      return {
        id: `show-${index}`,
        song: song.name,
        artist: song.artist,
        count: 1, // Always played once in this show
        showOrder: index + 1,
        isCover: song.isCover,
        spotifyError: true,
      };
    }
  });
};
