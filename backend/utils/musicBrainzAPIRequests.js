const axios = require("axios");
const Bottleneck = require("bottleneck");
const winston = require('winston');

const fetchMBIdFromSpotifyId = async (artistUrl) => {
    try {
        // Encode the artist URL to ensure it's safe for inclusion in a URL query parameter.
        const encodedUrl = encodeURIComponent(artistUrl);
        const apiUrl = `https://musicbrainz.org/ws/2/url/?query=url:${encodedUrl}&targettype=artist&fmt=json`;

        // Make the GET request to the MusicBrainz API.
        const response = await axios.get(apiUrl, {
            headers: {
                // A user-agent is required by MusicBrainz. Customize it as needed.
                'User-Agent': 'SetListScout/1.0 (setlistscout@gmail.com)',
            },
        });

        console.log('MusicBrainz data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error querying MusicBrainz API:', error);
        throw error;
    }
};

// Example usage within your fetchTour function:
// Assuming the artist object has a 'url' property:
// fetchMusicBrainzArtist(artist.url);


module.exports = { fetchMBIdFromSpotifyId };
