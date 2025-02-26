const express = require('express');
const router = express.Router();
const {
    getTourName,
    getAllTourSongs, getArtistPageByName, getArtistPageByMBID, delay,
    getAllTourSongsByMBID
} = require("../utils/setlistAPIRequests.js");
const { getSongTally, getTour, chooseTour } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo, getAccessToken, searchArtist } = require("../utils/spotifyAPIRequests.js");
const { fetchMBIdFromSpotifyId } = require("../utils/musicBrainzAPIRequests.js");
const { isArtistNameMatch } = require("../utils/musicBrainzChecks.js");

router.post('/', async (req, res) => {
    const { artist } = req.body;
    try {
        const mbInfo = await fetchMBIdFromSpotifyId(artist.url);
        const mbArtistName = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.name;
        const mbid = mbInfo?.urls?.[0]?.["relation-list"]?.[0]?.relations?.[0]?.artist?.id;
        // console.log("mbid: ", mbid);
        // return res.json(mbInfo);
        let artistPage;
        let matched = false;
        if (isArtistNameMatch(artist.name, mbArtistName)) {
            console.log("MBID matches Spotify ID!")
            matched = true;
            artistPage = await getArtistPageByMBID(mbid);
            // return res.json(artistPage);
        } else {
            console.log("MBID match failed, searching Setlist by name")
            artistPage = await getArtistPageByName(artist);

        }
        // return res.json(artistPage);
        const tourInfo = getTour(artistPage);
        // return res.json(tourInfo);

        const tourName = chooseTour(tourInfo, artist.name);
        // return res.json(tourName);
        // console.log("tour: ", tourName);

        if (!tourName) {
            return res.status(400).json({ error: "This Setlist does not have tour information" });
        }
        console.log("tourInfo: ", tourInfo);
        await delay(600);
        // Fetch all tour songs using setlist.fm API.
        let allTourInfo = [];
        if (matched) {
            allTourInfo = await getAllTourSongsByMBID(artist.name, mbid, tourName);
        } else {
            allTourInfo = await getAllTourSongs(artist.name, tourName);
        }
        // return res.json(allTourInfo);
        // If the function returned an error, handle it:
        if (!allTourInfo || !Array.isArray(allTourInfo)) {
            if (allTourInfo && allTourInfo.statusCode) {
                return res
                    .status(allTourInfo.statusCode)
                    .json({ error: allTourInfo.message });
            }
            // Otherwise, default to 400.
            return res
                .status(400)
                .json({ error: "Server is busy. Please try again." });
        }

        // Compile an ordered list of songs from the tour info.
        const tourInfoOrdered = getSongTally(allTourInfo);
        const spotifySongsOrdered = await getSpotifySongInfo(tourInfoOrdered.songsOrdered);
        const tourData = {
            bandName: artist.name,
            tourName: tourName,
            totalShows: tourInfoOrdered.totalShowsWithData,
        };

        res.json({ tourData, spotifySongsOrdered });
    } catch (error) {
        console.error('Error in /setlist route:', error);

        // Handle 504 Gateway Timeout specifically.
        if (error.response && error.response.status === 504) {
            return res.status(504).json({
                error: "Setlist.fm service is currently unavailable. Please try again later."
            });
        }

        // Handle other specific error statuses if needed
        if (error.response) {
            return res.status(error.response.status).json({ error: error.response.data.error || "An error occurred while fetching setlists." });
        }

        // Fallback for other errors
        res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
});

router.post('/artist_search', async (req, res) => {
    try {
        const token = await getAccessToken();
        const search_query = req.body.artistName;
        const searchResults = await searchArtist(token, search_query);
        res.json(searchResults);
    } catch (error) {
        console.error('Error in /artist_search route:', error);
        res.status(500).json({ error: "Internal Server Error. Please try again later." });
    }
}
);
module.exports = router;
