const { all } = require("axios");
const { getTourName } = require("./setlistAPIRequests");
const { isArtistNameMatch } = require("./musicBrainzChecks");
const devLogger = require('./devLogger');


module.exports = {

  /**
   * Extracts and formats tour information from artist page
   * - Organizes tours by artist and counts occurrences
   * - Tracks years of tour activity
   * 
   * @param {Object} artistPage Artist page data from Setlist.fm
   * @returns {Object} Formatted tour information by artist
   */
  getTour: (artistPage) => {
    // Validate input.
    if (!artistPage || !Array.isArray(artistPage.setlist)) {
      return {};
    }
    // The result is bject mapping artist names to tours.
    const result = {};
    for (const entry of artistPage.setlist) {
      // 1) Extract the artist name.
      const artistName = entry.artist?.name;
      if (!artistName) {
        continue; // Skip if no artist name.
      }
      // 2) Ensure result has a key for this artist.
      if (!result[artistName]) {
        result[artistName] = {};
      }
      // 3) Extract the tour name, defaulting to "No Tour Info" if none exists.
      const tourName = entry.tour?.name || "No Tour Info";
      // 4) Ensure we have an object for this tour under the given artist.
      if (!result[artistName][tourName]) {
        result[artistName][tourName] = {
          tourName,
          count: 0,
          years: new Set(),
        };
      }
      // 5) Increment the count of shows for this (artist, tour).
      result[artistName][tourName].count++;
      // 6) Extract the year from the eventDate if present.
      if (entry.eventDate) {
        // eventDate is usually in dd-mm-yyyy format.
        const parts = entry.eventDate.split("-");
        if (parts.length === 3) {
          const year = parts[2];
          result[artistName][tourName].years.add(year);
        }
      }
    }
    // 7) Convert each 'years' Set to a sorted array.
    for (const [artistName, toursMap] of Object.entries(result)) {
      for (const [tour, dataObj] of Object.entries(toursMap)) {
        dataObj.years = Array.from(dataObj.years).sort();
      }
    }
    return result;
  },

  /**
   * Chooses the best tour name based on various criteria
   * - Prefers actual tour names over "No Tour Info"
   * - Filters out VIP/soundcheck tours
   * - Selects most recent tour if multiple options
   * 
   * @param {Object} tourInfo Tour information from getTour
   * @param {string} targetArtistName Target artist name for matching
   * @returns {string} Selected tour name
   */
  chooseTour: (tourInfo, targetArtistName) => {
    const artistNames = Object.keys(tourInfo);
    let selectedArtist;
    // If only one artist, select that one.
    if (artistNames.length === 1) {
      selectedArtist = artistNames[0];
    } else {
      // If multiple, use isArtistNameMatch to choose the best match.
      selectedArtist = artistNames.find(name => isArtistNameMatch(targetArtistName, name));
      // Fallback if no match is found.
      if (!selectedArtist) {
        selectedArtist = artistNames[0];
      }
    }
    // Get the tours for the selected artist.
    const tours = tourInfo[selectedArtist];
    let tourNames = Object.keys(tours);
    if (tourNames.length === 0) {
      return ""; // No tour found.
    }
    // If multiple tours exist, prefer actual tour names over the placeholder.
    if (tourNames.length > 1) {
      const actualTours = tourNames.filter(name => name.toLowerCase() !== "no tour info");
      if (actualTours.length > 0) {
        tourNames = actualTours;
      }
    }
    // If there's only one tour option, return it.
    if (tourNames.length === 1) {
      return tours[tourNames[0]].tourName;
    }
    // Filter out tours with exclusion keywords like VIP or sound check.
    const exclusionKeywords = ["vip", "v.i.p.", "sound check", "soundcheck"];
    let filteredTours = tourNames.filter(tourName => {
      const lowerTourName = tourName.toLowerCase();
      return !exclusionKeywords.some(keyword => lowerTourName.includes(keyword));
    });
    // If filtering removes all options, revert to all tours.
    if (filteredTours.length === 0) {
      filteredTours = tourNames;
    }
    // Among the remaining tours, select the one with the most recent year.
    let chosenTourName = filteredTours[0];
    let latestYear = 0;
    for (const tourName of filteredTours) {
      const years = tours[tourName].years;
      // Determine the most recent year; if no year data, treat as 0.
      const recentYear = (years && years.length > 0)
        ? Math.max(...years.map(Number))
        : 0;
      if (recentYear > latestYear) {
        latestYear = recentYear;
        chosenTourName = tourName;
      }
    }
    return tours[chosenTourName].tourName;
  },

  /**
   * Processes and tallies songs from setlists
   * - Counts song occurrences across all shows
   * - Handles covers vs. original songs
   * - Calculates play frequencies
   * 
   * @param {Array} allTourInfo All tour setlist data
   * @returns {Object} Processed song data with counts and order
   */
  getSongTally: (allTourInfo) => {
    devLogger.log('setlist', `Starting song tally processing`, {
      totalDataPages: allTourInfo.length,
      firstPageSetlistCount: allTourInfo[0]?.setlist?.length || 0,
      firstPageTotal: allTourInfo[0]?.total || 0
    });

    const counts = new Map();
    const showsList = []; // NEW: Collect show metadata for dropdown
    // const totalShows = allTourInfo[0].total;
    let totalShowsWithData = 0
    let emptySetlistCount = 0; // Counter for setlists with no data

    // log Artist
    const mainArtist = allTourInfo[0].setlist[0].artist.name;

    devLogger.log('setlist', `Processing setlists for artist: ${mainArtist}`);

    allTourInfo.forEach((dataPage, pageIndex) => {
      // dataPage is a group of 20 shows from a specific artist's tour
      // dataPage.setlist is an array, each item is an individual show
      // "for each show...""

      devLogger.log('setlist', `Processing data page ${pageIndex + 1}`, {
        setlistCount: dataPage.setlist?.length || 0,
        pageTotal: dataPage.total || 0
      });

      dataPage.setlist.forEach((element, setlistIndex) => {
        // NEW: Collect show metadata regardless of whether it has song data
        if (element.id && element.eventDate) {
          const showMetadata = {
            id: element.id,
            date: element.eventDate, // DD-MM-YYYY format
            venue: element.venue?.name || 'Unknown Venue',
            city: element.venue?.city?.name || 'Unknown City',
            country: element.venue?.city?.country?.name || 'Unknown Country'
          };
          showsList.push(showMetadata);
        }

        // "sets" are different sections of a show ("main," "encore," etc.)
        // element.sets.set is an array of every section
        // so "for each section of the show..."
        // sometimes there are sets w/ no data. Log how mean
        if (!element.sets?.set?.length) {
          emptySetlistCount++;
          devLogger.log('setlist', `Empty setlist found`, {
            pageIndex: pageIndex + 1,
            setlistIndex: setlistIndex + 1,
            eventDate: element.eventDate,
            venue: element.venue?.name,
            city: element.venue?.city?.name
          });
        } else {
          totalShowsWithData++;
          devLogger.log('setlist', `Processing setlist with ${element.sets.set.length} sets`, {
            pageIndex: pageIndex + 1,
            setlistIndex: setlistIndex + 1,
            eventDate: element.eventDate,
            venue: element.venue?.name,
            setsCount: element.sets.set.length
          });
        }
        element.sets.set.forEach((setSection) => {
          setSection.song.forEach((song) => {
            // skips "Tape" songs (songs that are played before the show starts)
            if (song.hasOwnProperty("tape") && song.tape === true) {
              return;
            }
            // parse whether song is a cover or not, change artist info accordingly
            let currentArtist;
            if (song.hasOwnProperty("cover")) {
              currentArtist = song.cover.name;
            } else {
              currentArtist = mainArtist;
            }
            // create a key for the song, formatted as "artist|song" to match w/ its count
            const key = `${currentArtist}|${song.name}`;
            // if song alreadys, exists, increment its count
            if (counts.hasOwnProperty(key)) {
              counts[key].count++;
            } else {
              // else, create a new entry for the song
              counts[key] = {
                count: 1,
                song: song.name,
                artist: currentArtist,
              };
            }
          });
        });
      });
    });
    const countsOrdered = Object.values(counts);
    countsOrdered.sort((a, b) => {
      if (a.count < b.count) {
        return 1;
      } else if (a.count > b.count) {
        return -1;
      }
      return 0;
    });

    // Debug
    // console.log("counts_ordered: ", counts_ordered);
    // console.log("totalshows: ", totalShows);
    // console.log("emptySetlistCount: ", emptySetlistCount);
    // console.log("totalShows w data: ", totalShowsWithData);

    devLogger.log('setlist', `Song tally processing completed`, {
      totalSongsFound: countsOrdered.length,
      totalShowsWithData: totalShowsWithData,
      emptySetlistCount: emptySetlistCount,
      totalShows: showsList.length, // NEW: Log total shows including empty ones
      topSongs: countsOrdered.slice(0, 10).map(song => ({
        name: song.song,
        artist: song.artist,
        count: song.count
      }))
    });

    return {
      songsOrdered: countsOrdered,
      totalShowsWithData: totalShowsWithData,
      showsList: showsList, // NEW: Include shows metadata
    };;

  },


};
