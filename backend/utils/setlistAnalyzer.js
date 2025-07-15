/**
 * SetlistAnalyzer - Analyzes setlist data quality and determines optimal workflow
 * 
 * Handles the complex decision tree for different data scenarios:
 * 1. Current tour with good data
 * 2. Current tour with limited data  
 * 3. Old tour + recent non-tour shows (user choice)
 * 4. Old tour, no recent shows
 * 5. Very limited data overall
 */

const logger = require('./logger');

class SetlistAnalyzer {
  constructor(shows) {
    this.shows = shows || [];
    this.analysis = this.analyzeShows();
  }

  /**
   * Analyzes show data to extract patterns and quality metrics
   * @returns {Object} Analysis results with tour info, data quality, etc.
   */
  analyzeShows() {
    if (!this.shows.length) {
      return this.createEmptyAnalysis();
    }

    // Filter shows that have actual song data
    const showsWithSongs = this.shows.filter(show => {
      if (!show.sets?.set) return false;
      
      return show.sets.set.some(set => {
        // Handle array of songs
        if (Array.isArray(set.song) && set.song.length > 0) {
          return true;
        }
        // Handle single song object
        if (set.song && typeof set.song === 'object' && !Array.isArray(set.song)) {
          return true;
        }
        return false;
      });
    });
    
    // Debug logging
    logger.info(`[SetlistAnalyzer] Analysis for artist: Total shows: ${this.shows.length}, Shows with songs: ${showsWithSongs.length}`);
    
    if (showsWithSongs.length < 10) {
      logger.info(`[SetlistAnalyzer] Shows WITH songs details:`, {
        shows: showsWithSongs.slice(0, 5).map(show => ({
          date: show.eventDate,
          venue: show.venue?.name,
          tourName: show.tour?.name || 'No Tour Info',
          totalSongs: show.sets?.set?.reduce((total, set) => {
            if (Array.isArray(set.song)) return total + set.song.length;
            if (set.song) return total + 1;
            return total;
          }, 0) || 0,
          songNames: show.sets?.set?.flatMap(set => {
            if (Array.isArray(set.song)) return set.song.slice(0, 2).map(s => s.name || 'No name');
            if (set.song) return [set.song.name || 'No name'];
            return [];
          }).slice(0, 3) || []
        }))
      });
      
      // Log tour distribution
      const tourDistribution = {};
      showsWithSongs.forEach(show => {
        const tourName = show.tour?.name || 'No Tour Info';
        tourDistribution[tourName] = (tourDistribution[tourName] || 0) + 1;
      });
      logger.info(`[SetlistAnalyzer] Tour distribution of shows with songs:`, tourDistribution);
    }

    // Extract and analyze tours
    const tours = this.extractTours();
    const mostRecentTour = this.getMostRecentTour(tours);
    
    return {
      totalShows: this.shows.length,
      showsWithSongs: showsWithSongs.length,
      
      // Tour analysis
      mostRecentTour,
      tourAge: this.calculateTourAge(mostRecentTour),
      tourShowsWithSongs: this.countTourShowsWithSongs(mostRecentTour),
      
      // Non-tour recent shows
      recentNonTourShows: this.getRecentNonTourShows(showsWithSongs),
      
      // Overall data quality metrics
      recentShowsWithSongs: showsWithSongs.filter(show => 
        this.isWithinMonths(show.eventDate, 24)
      ).length,
      
      // Additional context
      tours: tours,
      oldestShowDate: this.shows.length > 0 ? this.shows[this.shows.length - 1]?.eventDate : null,
      newestShowDate: this.shows.length > 0 ? this.shows[0]?.eventDate : null
    };
  }

  /**
   * Creates empty analysis for artists with no shows
   */
  createEmptyAnalysis() {
    return {
      totalShows: 0,
      showsWithSongs: 0,
      mostRecentTour: null,
      tourAge: null,
      tourShowsWithSongs: 0,
      recentNonTourShows: [],
      recentShowsWithSongs: 0,
      tours: [],
      oldestShowDate: null,
      newestShowDate: null
    };
  }

  /**
   * Extracts tour information from shows
   * Groups shows by tour name and calculates metrics
   */
  extractTours() {
    const tourMap = new Map();
    
    this.shows.forEach(show => {
      const tourName = show.tour?.name;
      if (!tourName || tourName === "No Tour Info") return;
      
      if (!tourMap.has(tourName)) {
        tourMap.set(tourName, {
          name: tourName,
          shows: [],
          showsWithSongs: 0,
          years: new Set(),
          mostRecentDate: null
        });
      }
      
      const tour = tourMap.get(tourName);
      tour.shows.push(show);
      
      // Count shows with songs (handle both array and single object)
      if (show.sets?.set?.some(set => {
        if (Array.isArray(set.song)) {
          return set.song.length > 0;
        }
        return !!set.song;
      })) {
        tour.showsWithSongs++;
      }
      
      // Track years and dates
      if (show.eventDate) {
        const date = new Date(show.eventDate.split('-').reverse().join('-'));
        if (!tour.mostRecentDate || date > tour.mostRecentDate) {
          tour.mostRecentDate = date;
        }
        
        const year = show.eventDate.split('-')[2];
        tour.years.add(year);
      }
    });
    
    return Array.from(tourMap.values())
      .sort((a, b) => {
        // Sort by most recent date, then by shows with songs
        if (a.mostRecentDate && b.mostRecentDate) {
          return b.mostRecentDate - a.mostRecentDate;
        }
        return b.showsWithSongs - a.showsWithSongs;
      });
  }

  /**
   * Gets the most recent tour (by date, then by data quality)
   */
  getMostRecentTour(tours) {
    if (!tours.length) return null;
    
    // Prefer tours with actual song data
    const toursWithSongs = tours.filter(tour => tour.showsWithSongs > 0);
    return toursWithSongs.length > 0 ? toursWithSongs[0] : tours[0];
  }

  /**
   * Calculates age of tour in months
   */
  calculateTourAge(tour) {
    if (!tour?.mostRecentDate) return null;
    
    const now = new Date();
    const tourDate = tour.mostRecentDate;
    return Math.round((now - tourDate) / (1000 * 60 * 60 * 24 * 30.44)); // Average month length
  }

  /**
   * Counts shows with songs for a specific tour
   */
  countTourShowsWithSongs(tour) {
    return tour?.showsWithSongs || 0;
  }

  /**
   * Gets recent shows that aren't part of any named tour
   */
  getRecentNonTourShows(showsWithSongs) {
    return showsWithSongs.filter(show => {
      const isRecent = this.isWithinMonths(show.eventDate, 12);
      const hasNoTour = !show.tour?.name || show.tour.name === "No Tour Info";
      return isRecent && hasNoTour;
    });
  }

  /**
   * Checks if a date is within specified months from now
   */
  isWithinMonths(eventDate, months) {
    if (!eventDate) return false;
    
    try {
      // Convert dd-mm-yyyy to Date
      const [day, month, year] = eventDate.split('-');
      const showDate = new Date(year, month - 1, day);
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      
      return showDate >= cutoffDate;
    } catch (error) {
      return false;
    }
  }

  /**
   * Main decision tree - determines the optimal workflow based on data analysis
   * @returns {Object} Workflow decision with type, message, and options
   */
  determineWorkflow() {
    const { 
      mostRecentTour, 
      tourAge, 
      tourShowsWithSongs, 
      recentNonTourShows, 
      recentShowsWithSongs 
    } = this.analysis;
    
    // Case 5: Very limited data (trigger: less than 5 shows with songs EVER)
    if (this.analysis.showsWithSongs < 5) {
      return {
        workflow: 'AGGREGATE_ALL',
        message: 'Limited setlist data available for this artist. We\'ll gather all available shows to build the best playlist possible.',
        showCount: 60, // Get as many as possible
        dataQualityWarning: 'Based on limited available data'
      };
    }
    
    // Case 1: Current tour with good data
    if (tourAge !== null && tourAge < 6 && tourShowsWithSongs >= 10) {
      return {
        workflow: 'CURRENT_TOUR',
        tour: mostRecentTour,
        message: null,
        dataQualityWarning: null
      };
    }
    
    // Case 2: Current tour, limited data
    if (tourAge !== null && tourAge < 6 && tourShowsWithSongs >= 3 && tourShowsWithSongs < 10) {
      return {
        workflow: 'CURRENT_TOUR',
        tour: mostRecentTour,
        message: null,
        dataQualityWarning: `Early tour data (${tourShowsWithSongs} shows) - setlists may evolve as tour progresses`
      };
    }
    
    // Case 3: Old tour + recent non-tour shows - Auto-choose recent shows (more current)
    if (tourAge !== null && tourAge > 12 && recentNonTourShows.length >= 5) {
      const tourYears = Math.floor(tourAge / 12);
      return {
        workflow: 'RECENT_SHOWS',
        shows: recentNonTourShows,
        message: `Using recent performances instead of ${tourYears}-year-old tour data`,
        dataQualityWarning: `Based on recent individual shows (${recentNonTourShows.length} shows)`
      };
    }
    
    // Case 4: Old tour, no recent shows
    if (tourAge !== null && tourAge > 12 && recentNonTourShows.length < 5) {
      const tourYears = Math.floor(tourAge / 12);
      return {
        workflow: 'OLD_TOUR',
        tour: mostRecentTour,
        message: null,
        dataQualityWarning: `This tour ended ${tourYears} year${tourYears !== 1 ? 's' : ''} ago - songs may differ from current setlists`
      };
    }
    
    // Fallback: Aggregate recent shows
    return {
      workflow: 'AGGREGATE_RECENT',
      showCount: 40,
      message: null,
      dataQualityWarning: 'Based on recent performances'
    };
  }

  /**
   * Static method to create analyzer and determine workflow in one call
   */
  static analyzeAndDetermineWorkflow(shows) {
    const analyzer = new SetlistAnalyzer(shows);
    return {
      analysis: analyzer.analysis,
      workflow: analyzer.determineWorkflow()
    };
  }
}

module.exports = SetlistAnalyzer;