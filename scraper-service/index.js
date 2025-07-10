require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { scrapeTours } = require('./tourScraper');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow requests from your main backend
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'setlist-scraper' });
});

// Tour scraping endpoint
app.get('/tours/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Validate slug format
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Invalid artist slug' });
    }
    
    console.log(`Scraping tours for slug: ${slug}`);
    
    const tours = await scrapeTours(slug);
    
    res.json({ 
      tours,
      artistSlug: slug,
      count: tours.length
    });
    
  } catch (error) {
    console.error('Error in /tours endpoint:', error);
    
    // Don't expose internal error details
    res.status(500).json({ 
      error: 'Failed to fetch tour data',
      message: error.message.includes('404') ? 'Artist not found' : 'Service temporarily unavailable'
    });
  }
});

// For serverless deployment (Vercel)
module.exports = app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Scraper service running on port ${PORT}`);
  });
}