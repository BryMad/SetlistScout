
/**
 * Checks if artist names match between Spotify and MusicBrainz
 * - Normalizes strings (lowercase, remove diacritics)
 * - Checks for exact match or partial inclusion
 * 
 * @param {string} spotifyName Artist name from Spotify
 * @param {string} mbName Artist name from MusicBrainz
 * @returns {boolean} True if names match, false otherwise
 */
function isArtistNameMatch(spotifyName, mbName) {
  if (!spotifyName || !mbName) return false;
  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizedSpotify = normalize(spotifyName);
  const normalizedMB = normalize(mbName);

  return (
    normalizedSpotify === normalizedMB ||
    normalizedSpotify.includes(normalizedMB) ||
    normalizedMB.includes(normalizedSpotify)
  );
}


module.exports = { isArtistNameMatch };
