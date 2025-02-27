const ensureAuthenticated = (req, res, next) => {
  console.log('Request cookies:', req.headers.cookie);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Authentication check:', {
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.access_token,
    hasUserId: !!req.session?.user_id,
    userAgent: req.headers['user-agent']
  });

  if (req.session && req.session.access_token && req.session.user_id) {
    return next();
  } else {
    return res.status(401).json({ error: 'User not authenticated' });
  }
};

module.exports = ensureAuthenticated;