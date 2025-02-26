function isArtistNameMatch(spotifyName, mbName) {
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
