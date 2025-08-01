// File: ./backend/routes/sseRoutes.js
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const sseRouter = express.Router();
const sseManager = require('../utils/sseManager');

// Store for SSE tokens
const sseTokens = new Map();

// Rate limiter for SSE token requests
const tokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 token requests per window
  message: 'Too many SSE token requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for SSE connections
const sseConnectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 SSE connections per window (increased for development)
  message: 'Too many SSE connections',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Endpoint: POST /request-token
 * Generates a temporary token for SSE connection
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
sseRouter.post('/request-token', tokenRateLimiter, (req, res) => {
  // Generate a secure random token
  const token = crypto.randomBytes(16).toString('hex');
  
  // Store token with metadata
  sseTokens.set(token, {
    createdAt: Date.now(),
    ip: req.ip,
    used: false
  });
  
  // Token expires in 30 seconds if unused
  setTimeout(() => {
    sseTokens.delete(token);
  }, 30000);
  
  res.json({ token });
});

/**
 * Endpoint: GET /connect
 * Establishes an SSE connection with the client
 * Requires a valid token for security
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
sseRouter.get('/connect', sseConnectionLimiter, (req, res) => {
  const { token } = req.query;
  
  // Validate token
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  const tokenData = sseTokens.get(token);
  if (!tokenData) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  if (tokenData.used) {
    return res.status(401).json({ error: 'Token already used' });
  }
  
  // Validate IP matches (optional extra security)
  if (tokenData.ip !== req.ip) {
    return res.status(401).json({ error: 'Token IP mismatch' });
  }
  
  // Mark token as used
  tokenData.used = true;
  
  // Delete token after use (clean up)
  setTimeout(() => {
    sseTokens.delete(token);
  }, 1000);
  
  // Check if we're at max connections
  const maxConnections = 100;
  if (sseManager.getConnectionCount() >= maxConnections) {
    return res.status(503).json({ error: 'Server at capacity' });
  }
  
  // Establish SSE connection
  const clientId = sseManager.addClient(res);

  // Handle client disconnect
  req.on('close', () => {
    // Cancel any active processes for this client
    sseManager.cancelActiveProcess(clientId);
    sseManager.removeClient(clientId);
  });
});

module.exports = sseRouter;
