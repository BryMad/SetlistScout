// File: ./backend/routes/consentRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Endpoint: POST /log
 * Logs user consent to terms and privacy policy
 * 
 * @param {Object} req.body.consentData Consent data including timestamp
 * @returns {Object} Success message and consent ID
 */
router.post('/log', async (req, res) => {
  try {
    const { consentData } = req.body;

    if (!consentData || !consentData.date) {
      return res.status(400).json({ error: 'Invalid consent data' });
    }

    // Generate a unique ID for this consent record
    const consentId = uuidv4();

    // Add IP address and user agent for additional verification
    // Note: IP is stored for legitimate purposes (proof of consent)
    const consentRecord = {
      id: consentId,
      date: consentData.date,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      agreedToTerms: !!consentData.agreedToTerms,
      agreedToPrivacy: !!consentData.agreedToPrivacy,
      termsVersion: process.env.TERMS_VERSION || '1.0',
      privacyVersion: process.env.PRIVACY_VERSION || '1.0'
    };

    // Store in Redis with 2-year expiration (typical statute of limitations)
    // Key format: consent:{consentId}
    const redisKey = `consent:${consentId}`;

    // Use Redis client from req.app.get('redisClient')
    const redisClient = req.app.get('redisClient');

    if (!redisClient || !redisClient.isOpen) {
      logger.error('Redis client unavailable');
      return res.status(500).json({
        error: 'Database connection issue',
        localStorageOnly: true
      });
    }

    // Store consent record in Redis with 2-year expiration (in seconds)
    const TWO_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 2;
    await redisClient.set(redisKey, JSON.stringify(consentRecord));
    await redisClient.expire(redisKey, TWO_YEARS_IN_SECONDS);

    logger.info(`Consent logged: ${consentId}`);

    // Return success with the consent ID
    res.status(200).json({
      success: true,
      message: 'Consent logged successfully',
      consentId
    });
  } catch (error) {
    logger.error('Error logging consent:', error);
    res.status(500).json({
      error: 'Failed to log consent',
      localStorageOnly: true
    });
  }
});

/**
 * Endpoint: GET /verify/:consentId
 * Verifies if a consent record exists
 * 
 * @param {string} req.params.consentId Consent ID to verify
 * @returns {Object} Consent verification status
 */
router.get('/verify/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;

    if (!consentId) {
      return res.status(400).json({ error: 'Consent ID required' });
    }

    const redisClient = req.app.get('redisClient');

    if (!redisClient || !redisClient.isOpen) {
      logger.error('Redis client unavailable');
      return res.status(500).json({ error: 'Database connection issue' });
    }

    const redisKey = `consent:${consentId}`;
    const consentRecord = await redisClient.get(redisKey);

    if (!consentRecord) {
      return res.status(404).json({
        verified: false,
        message: 'No consent record found'
      });
    }

    res.status(200).json({
      verified: true,
      message: 'Consent record verified',
      details: JSON.parse(consentRecord)
    });
  } catch (error) {
    logger.error('Error verifying consent:', error);
    res.status(500).json({ error: 'Failed to verify consent' });
  }
});

module.exports = router;