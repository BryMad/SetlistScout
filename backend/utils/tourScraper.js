const axios = require('axios');
const cheerio = require('cheerio');
const Bottleneck = require('bottleneck');
const logger = require('./logger');

// Create a separate limiter for web scraping with more conservative settings
const scrapeLimiter = new Bottleneck({
  minTime: 1000, // 1 second between requests (respectful scraping)
  maxConcurrent: 1,
});

/**
 * Scrapes tour data from setlist.fm stats pages
 * @param {string} artistSlug - The setlist.fm artist slug (e.g., "the-beatles-23d6a88b")
 * @returns {Promise<Array>} Array of tour objects with name, year, and show count
 */
async function scrapeTours(artistSlug) {
  try {
    logger.info('Scraping tours for artist', { artistSlug });
    
    // Use the concert-map page which reliably contains tour data
    const url = `https://www.setlist.fm/stats/concert-map/${artistSlug}.html`;
    
    // Fetch the HTML with a user agent to appear as a regular browser
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Load HTML into Cheerio
    const $ = cheerio.load(response.data);
    
    // Array to store tour data
    const tours = [];
    
    // Look for the tour list - tours are in list items with two links:
    // 1. Tour name link: <a href="...?tour=id">Tour Name</a>
    // 2. Show count link: (<a href="...">48</a>)
    
    // Find all list items that contain tour links
    $('li').each((index, element) => {
      const $li = $(element);
      const $tourLink = $li.find('a[href*="?tour="]').first();
      
      if ($tourLink.length === 0) return;
      
      const href = $tourLink.attr('href');
      const tourName = $tourLink.text().trim();
      
      // Skip if not a stats page tour link
      if (!href || !href.includes('stats/') || !href.includes('?tour=')) return;
      
      // Extract tour ID from href
      const tourIdMatch = href.match(/\?tour=([^&]+)/);
      const tourId = tourIdMatch ? tourIdMatch[1] : null;
      
      // Find the show count - it's in a sibling link or in parentheses
      let showCount = 0;
      
      // Look for a number in parentheses or in a following link
      const $showCountLink = $li.find('a[href*="search?"][href*="tour="]');
      if ($showCountLink.length > 0) {
        const countText = $showCountLink.text().trim();
        const countNum = parseInt(countText, 10);
        if (!isNaN(countNum)) {
          showCount = countNum;
        }
      } else {
        // Fallback: look for number in parentheses in the li text
        const liText = $li.text();
        const countMatch = liText.match(/\((\d+)\)/);
        if (countMatch) {
          showCount = parseInt(countMatch[1], 10);
        }
      }
      
      // Extract year if present in tour name
      const yearMatch = tourName.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : null;
      
      if (tourId && tourName) {
        tours.push({
          id: tourId,
          name: tourName,
          year: year,
          showCount: showCount
        });
      }
    });
    
    // Remove duplicates (in case we picked up the same tour multiple times)
    const uniqueTours = [];
    const seenIds = new Set();
    
    tours.forEach(tour => {
      if (!seenIds.has(tour.id)) {
        seenIds.add(tour.id);
        uniqueTours.push(tour);
      }
    });
    
    // Sort tours by year (newest first), then by show count
    uniqueTours.sort((a, b) => {
      if (a.year && b.year) {
        const yearDiff = parseInt(b.year) - parseInt(a.year);
        if (yearDiff !== 0) return yearDiff;
      } else if (a.year) {
        return -1; // Tours with years come first
      } else if (b.year) {
        return 1;
      }
      return b.showCount - a.showCount;
    });
    
    logger.info('Successfully scraped tours', { 
      artistSlug, 
      tourCount: uniqueTours.length 
    });
    
    return uniqueTours;
  } catch (error) {
    logger.error('Error scraping tours', { 
      error: error.message, 
      artistSlug 
    });
    throw error;
  }
}

// Rate-limited version of the scraper
const scrapeToursRateLimited = scrapeLimiter.wrap(scrapeTours);

module.exports = {
  scrapeTours: scrapeToursRateLimited
};