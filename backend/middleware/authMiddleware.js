
/**
 * Modified middleware to use admin credentials instead of user session
 * 
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 * @returns {Function} Next middleware or 401 unauthorized response
 */
const ensureAuthenticated = async (req, res, next) => {
  try {
    const adminAuth = req.app.locals.adminAuth;

    // Check if admin is set up
    const isSetup = await adminAuth.isSetup();
    if (!isSetup) {
      return res.status(401).json({
        error: 'Admin setup required',
        setupRequired: true
      });
    }

    // Add admin access token to request for use in routes
    req.adminToken = await adminAuth.getAccessToken();
    req.adminUserId = await adminAuth.getUserId();

    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = ensureAuthenticated;