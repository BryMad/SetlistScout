// File: ./frontend/src/api/sseService.js
import { server_url } from "../App";

/**
 * Service for handling Server-Sent Events connection
 */
class EventSourceService {
  constructor() {
    this.eventSource = null;
    this.clientId = null;
    this.listeners = new Map();
    this.connectionPromise = null;
  }

  /**
   * Connect to the SSE endpoint
   * 
   * @returns {Promise<string>} Promise resolving to client ID
   */
  connect() {
    // Only create one connection
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        // Close any existing connection
        this.disconnect();

        // Step 1: Request a token
        const tokenResponse = await fetch(`${server_url}/sse/request-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get SSE token: ${tokenResponse.status}`);
        }

        const { token } = await tokenResponse.json();

        // Step 2: Create new EventSource connection with token
        this.eventSource = new EventSource(`${server_url}/sse/connect?token=${token}`);

        // Handle connection open
        this.eventSource.onopen = () => {
          console.log('SSE connection established');
        };

        // Handle messages
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('SSE message received:', data);

            // Handle initial connection message to get clientId
            if (data.type === 'connection') {
              this.clientId = data.clientId;
              resolve(this.clientId);
            }

            // Notify all listeners
            this.notifyListeners(data);

            // If process is complete or has error, close the connection
            if (data.type === 'complete' || data.type === 'error') {
              this.disconnect();
            }
          } catch (error) {
            console.error('Error processing SSE message:', error);
          }
        };

        // Handle errors
        this.eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          this.notifyListeners({ type: 'connection_error', message: 'Connection to server lost' });

          // If we haven't resolved the clientId promise yet, reject it
          if (!this.clientId) {
            reject(new Error('Failed to establish SSE connection'));
            this.connectionPromise = null;
          }

          this.disconnect();
        };
      } catch (error) {
        console.error('Error setting up SSE connection:', error);
        reject(error);
        this.connectionPromise = null;
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionPromise = null;
    this.clientId = null;
  }

  /**
   * Add a listener for SSE events
   * 
   * @param {string} id Unique identifier for this listener
   * @param {Function} callback Function to call with event data
   */
  addListener(id, callback) {
    this.listeners.set(id, callback);
  }

  /**
   * Remove a listener
   * 
   * @param {string} id Listener ID to remove
   */
  removeListener(id) {
    this.listeners.delete(id);
  }

  /**
   * Notify all listeners of an event
   * 
   * @param {Object} data Event data
   * @private
   */
  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in SSE listener callback:', error);
      }
    });
  }

  /**
   * Get the current client ID
   * 
   * @returns {string|null} Current client ID or null if not connected
   */
  getClientId() {
    return this.clientId;
  }
}

// Create singleton instance
const eventSourceService = new EventSourceService();
export default eventSourceService;