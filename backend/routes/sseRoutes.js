// File: ./backend/routes/sseRoutes.js
const express = require('express');
const sseRouter = express.Router();
const sseManager = require('../utils/sseManager');

/**
 * Endpoint: GET /connect
 * Establishes an SSE connection with the client
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
sseRouter.get('/connect', (req, res) => {
  const clientId = sseManager.addClient(res);

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeClient(clientId);
  });
});

module.exports = sseRouter;
