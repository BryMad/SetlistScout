const { scrapeTours } = require('../../tourScraper');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Health check
  if (event.path === '/health' || event.path === '/.netlify/functions/scraper') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ok', service: 'setlist-scraper-netlify' })
    };
  }

  // Extract slug from path
  const pathParts = event.path.split('/');
  const slug = pathParts[pathParts.length - 1];

  if (!slug || slug === 'scraper') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid artist slug' })
    };
  }

  try {
    console.log(`Scraping tours for slug: ${slug}`);
    
    const tours = await scrapeTours(slug);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tours,
        artistSlug: slug,
        count: tours.length
      })
    };
  } catch (error) {
    console.error('Error in scraper function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch tour data',
        message: error.message.includes('404') ? 'Artist not found' : 'Service temporarily unavailable'
      })
    };
  }
};