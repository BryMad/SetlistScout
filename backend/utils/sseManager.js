// File: ./backend/utils/sseManager.js
const logger = require('./logger');

/**
 * Simple SSE (Server-Sent Events) Manager
 * Manages client connections and message distribution
 */
class SSEManager {
  constructor() {
    this.clients = new Map();
    this.clientIdCounter = 0;
    logger.info('SSE Manager initialized');
  }

  /**
   * Register a new client connection
   * @param {Object} res - Express response object
   * @returns {string} Client ID
   */
  addClient(res) {
    const clientId = (++this.clientIdCounter).toString();

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to server events', clientId })}\n\n`);

    // Store the response object
    this.clients.set(clientId, res);

    logger.info(`Client connected: ${clientId}`);
    return clientId;
  }

  /**
   * Remove a client connection
   * @param {string} clientId - ID of client to remove
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      logger.info(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Send an update message to a specific client
   * @param {string} clientId - ID of client to send to
   * @param {string} stage - Current processing stage
   * @param {string} message - Status message
   * @param {number} [progress] - Optional progress percentage (0-100)
   * @param {Object} [data] - Optional additional data
   */
  sendUpdate(clientId, stage, message, progress = null, data = null) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to send update to non-existent client: ${clientId}`);
      return;
    }

    const event = {
      type: 'update',
      stage,
      message,
      timestamp: new Date().toISOString()
    };

    if (progress !== null) {
      event.progress = progress;
    }

    if (data !== null) {
      event.data = data;
    }

    const res = this.clients.get(clientId);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    logger.debug(`Update sent to client ${clientId}: ${message}`);
  }

  /**
   * Send a completion message and close the connection
   * @param {string} clientId - ID of client to complete
   * @param {Object} finalData - Final data to send with completion
   */
  completeProcess(clientId, finalData = {}) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to complete process for non-existent client: ${clientId}`);
      return;
    }

    const res = this.clients.get(clientId);
    const event = {
      type: 'complete',
      message: 'Process completed',
      timestamp: new Date().toISOString(),
      data: finalData
    };

    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
    this.removeClient(clientId);
    logger.info(`Process completed for client: ${clientId}`);
  }

  /**
   * Send an error message and close the connection
   * @param {string} clientId - ID of client to send error to
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  sendError(clientId, message, statusCode = 500) {
    if (!this.clients.has(clientId)) {
      logger.warn(`Attempted to send error to non-existent client: ${clientId}`);
      return;
    }

    const res = this.clients.get(clientId);
    const event = {
      type: 'error',
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end();
    this.removeClient(clientId);
    logger.error(`Error sent to client ${clientId}: ${message}`);
  }
}

// Create singleton instance
const sseManager = new SSEManager();
module.exports = sseManager;