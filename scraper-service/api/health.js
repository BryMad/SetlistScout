module.exports = async (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'setlist-scraper',
    timestamp: new Date().toISOString()
  });
};