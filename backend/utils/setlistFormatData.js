const { all } = require("axios");
const { getTourName } = require("./setlistAPIRequests");
const { isArtistNameMatch } = require("./musicBrainzChecks");


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
   * Processes multiple pages to extract all tours with enhanced metadata
   * - Combines setlists from multiple pages
   * - Adds date ranges and staleness info
   * - Detects orphan shows
   * 
   * @param {Array} pages Array of page data from API
   * @param {string} targetArtistName Target artist name
   * @returns {Object} Tour analysis with metadata
   */
  analyzeTours: (pages, targetArtistName) => {
    // Combine all setlists from all pages
    const allSetlists = [];
    pages.forEach(page => {
      if (page && page.setlist) {
        allSetlists.push(...page.setlist);
      }
    });

    if (allSetlists.length === 0) {
      return { tours: [], orphanShows: 0, totalShows: 0 };
    }

    // Process tours using existing getTour logic
    const tourInfo = module.exports.getTour({ setlist: allSetlists });
    
    // Find the matching artist
    const artistNames = Object.keys(tourInfo);
    let selectedArtist;
    if (artistNames.length === 1) {
      selectedArtist = artistNames[0];
    } else {
      selectedArtist = artistNames.find(name => isArtistNameMatch(targetArtistName, name)) || artistNames[0];
    }

    const tours = tourInfo[selectedArtist] || {};
    const tourList = [];
    let orphanShows = 0;

    // Process each tour
    Object.entries(tours).forEach(([tourName, tourData]) => {
      const isOrphan = tourName.toLowerCase() === "no tour info";
      
      if (isOrphan) {
        orphanShows = tourData.count;
      }

      // Calculate date range for the tour
      const tourSetlists = allSetlists.filter(setlist => 
        (setlist.tour?.name || "No Tour Info") === tourName &&
        setlist.artist?.name === selectedArtist
      );

      let earliestDate = null;
      let latestDate = null;

      tourSetlists.forEach(setlist => {
        if (setlist.eventDate) {
          const parts = setlist.eventDate.split("-");
          if (parts.length === 3) {
            // Convert dd-mm-yyyy to Date object
            const date = new Date(parts[2], parts[1] - 1, parts[0]);
            if (!earliestDate || date < earliestDate) earliestDate = date;
            if (!latestDate || date > latestDate) latestDate = date;
          }
        }
      });

      // Check if tour is stale (last show was 2+ years ago)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const isStale = latestDate && latestDate < twoYearsAgo;

      tourList.push({
        name: tourName,
        count: tourData.count,
        years: tourData.years,
        earliestDate: earliestDate ? earliestDate.toISOString() : null,
        latestDate: latestDate ? latestDate.toISOString() : null,
        isOrphan,
        isStale,
        isVIPOrSoundcheck: ["vip", "v.i.p.", "sound check", "soundcheck"].some(
          keyword => tourName.toLowerCase().includes(keyword)
        )
      });
    });

    // Sort tours by latest date (most recent first)
    tourList.sort((a, b) => {
      if (!a.latestDate && !b.latestDate) return 0;
      if (!a.latestDate) return 1;
      if (!b.latestDate) return -1;
      return new Date(b.latestDate) - new Date(a.latestDate);
    });

    return {
      tours: tourList,
      orphanShows,
      totalShows: Math.min(allSetlists.length, 60), // Cap at 60 shows (3 pages of 20)
      selectedArtist
    };
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
    const counts = new Map();
    // const totalShows = allTourInfo[0].total;
    let totalShowsWithData = 0
    let emptySetlistCount = 0; // Counter for setlists with no data

    // log Artist
    const mainArtist = allTourInfo[0].setlist[0].artist.name;

    allTourInfo.forEach((dataPage) => {
      // dataPage is a group of 20 shows from a specific artist's tour
      // dataPage.setlist is an array, each item is an individual show
      // "for each show...""
      dataPage.setlist.forEach((element) => {
        // "sets" are different sections of a show ("main," "encore," etc.)
        // element.sets.set is an array of every section
        // so "for each section of the show..."
        // sometimes there are sets w/ no data. Log how mean
        if (!element.sets?.set?.length) {
          emptySetlistCount++;
        } else {
          totalShowsWithData++;
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
    return {
      songsOrdered: countsOrdered,
      totalShowsWithData: totalShowsWithData,
    };;

  },


};
