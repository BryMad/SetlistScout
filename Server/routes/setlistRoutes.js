const express = require('express');
const router = express.Router();
const {
  getTourName,
  getAllTourSongs, delay
} = require("../utils/setlistAPIRequests.js");
const { getSongTally } = require("../utils/setlistFormatData.js");
const { getSpotifySongInfo } = require("../utils/spotifyAPIRequests.js");

router.post('/', async (req, res) => {
  try {

    const tourInfo = await getTourName(req.body.listID);
    console.log("======tourInfo:===== ", tourInfo);

    // If setlist has no tour information, set status, return error
    if (!tourInfo.tourName) {
      return res.status(400).json({ error: "This Setlist does not have tour information" });
    }
    console.log("tourInfo: ", tourInfo);
    await delay(600);
    // Get all tour songs played during the tour from setlist.fm API call
    const allTourInfo = await getAllTourSongs(
      tourInfo.bandName,
      tourInfo.tourName
    );
    // Handle error if no tour information is returned
    if (!allTourInfo || !Array.isArray(allTourInfo)) {
      return res.status(400).json({ error: "Server is busy. Please try again" });
    }

    // Parse all tour songs to get ordered song list
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

    // Check if the error is a 504 Gateway Timeout
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

module.exports = router;
