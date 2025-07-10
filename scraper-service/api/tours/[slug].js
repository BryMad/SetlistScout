const { scrapeTours } = require('../../tourScraper');

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5001', 'http://localhost:5173'];

module.exports = async (req, res) => {
  // Set CORS headers
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { slug } = req.query;
    
    // Validate slug format
    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ error: 'Invalid artist slug' });
      return;
    }
    
    console.log(`Scraping tours for slug: ${slug}`);
    
    const tours = await scrapeTours(slug);
    
    res.status(200).json({ 
      tours,
      artistSlug: slug,
      count: tours.length
    });
    
  } catch (error) {
    console.error('Error scraping tours:', error);
    
    // Don't expose internal error details
    res.status(500).json({ 
      error: 'Failed to fetch tour data',
      message: error.message.includes('404') ? 'Artist not found' : 'Service temporarily unavailable'
    });
  }
};