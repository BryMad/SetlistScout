const express = require('express');
const router = express.Router();
const {
  getTourName,
  getAllTourSongs, searchArtistInfo, delay
} = require("../utils/setlistAPIRequests.js");
const { getSongTally } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo, getAccessToken, searchArtist } = require("../utils/spotifyAPIRequests.js");

router.post('/', async (req, res) => {
  const { artist } = req.body;
  try {
    const artistInfo = await searchArtistInfo(artist);
    // TODO const tourName = helper(artistInfo)

    // API call for setlist w/ artistname
    // https://api.setlist.fm/rest/1.0/search/setlists?artistName=mj%20lenderman&p=1
    // ! helper to get tourname from object

    // const tourInfo = await getTourName(req.body.listID);
    // console.log("tourInfo: ", tourInfo);

    // If setlist has no tour information, return error
    // if (!tourInfo.tourName) {
    //   return res.status(400).json({ error: "This Setlist does not have tour information" });
    // }
    // console.log("tourInfo: ", tourInfo);
    // await delay(600);
    // Fetch all tour songs using setlist.fm API.
    const allTourInfo = await getAllTourSongs(
      artist, tourName
    );
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
      bandName: tourInfo.bandName,
      tourName: tourInfo.tourName,
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
