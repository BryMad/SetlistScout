const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.access_token && req.session.user_id) {
    return next();
  } else {
    return res.status(401).json({ error: 'User not authenticated' });
  }
};


module.exports = ensureAuthenticated;
