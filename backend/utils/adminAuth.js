const axios = require('axios');
const qs = require('qs');
const logger = require('./logger');

/**
 * Service responsible for managing admin Spotify credentials
 * - Handles token storage, refresh, and retrieval
 * - Uses Redis for persistent storage
 */
class AdminAuthService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.REDIS_KEY_PREFIX = 'spotify_admin:';
    this.CLIENT_ID = process.env.CLIENT_ID;
    this.CLIENT_SECRET = process.env.CLIENT_SECRET;
    this.REDIRECT_URI = process.env.REDIRECT_URI;
    this.initialized = false;
  }

  /**
   * Checks if admin credentials are already set up
   *
   * @returns {Promise<boolean>} True if admin is authenticated
   */
  async isSetup() {
    try {
      const accessToken = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}access_token`);
      const refreshToken = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}refresh_token`);
      return !!(accessToken && refreshToken);
    } catch (error) {
      logger.error('Error checking admin setup status:', error);
      return false;
    }
  }

  /**
   * Saves admin tokens to Redis
   *
   * @param {Object} tokens Object containing access_token, refresh_token, and expires_in
   * @returns {Promise<void>}
   */
  async saveTokens(tokens) {
    try {
      const multi = this.redisClient.multi();

      // Store access token with expiry
      const expirySeconds = tokens.expires_in - 60; // 1 minute buffer
      multi.set(`${this.REDIS_KEY_PREFIX}access_token`, tokens.access_token, {
        EX: expirySeconds
      });

      // Store refresh token (no expiry)
      multi.set(`${this.REDIS_KEY_PREFIX}refresh_token`, tokens.refresh_token);

      // Store user ID (no expiry)
      if (tokens.user_id) {
        multi.set(`${this.REDIS_KEY_PREFIX}user_id`, tokens.user_id);
      }

      await multi.exec();
      this.initialized = true;
      logger.info('Admin tokens saved to Redis');
    } catch (error) {
      logger.error('Error saving admin tokens:', error);
      throw error;
    }
  }

  /**
   * Get admin access token (refreshing if needed)
   *
   * @returns {Promise<string>} Valid access token
   */
  async getAccessToken() {
    try {
      // Try to get the current access token
      let accessToken = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}access_token`);

      // If token exists, return it
      if (accessToken) {
        return accessToken;
      }

      // Otherwise, refresh the token
      const refreshToken = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}refresh_token`);
      if (!refreshToken) {
        throw new Error('No refresh token available. Admin setup required.');
      }

      const tokens = await this.refreshAccessToken(refreshToken);
      return tokens.access_token;
    } catch (error) {
      logger.error('Error getting admin access token:', error);
      throw error;
    }
  }

  /**
   * Get admin user ID
   *
   * @returns {Promise<string>} User ID
   */
  async getUserId() {
    try {
      return await this.redisClient.get(`${this.REDIS_KEY_PREFIX}user_id`);
    } catch (error) {
      logger.error('Error getting admin user ID:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token using the refresh token
   *
   * @param {string} refreshToken Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const data = qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')
      };

      const response = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

      const tokens = {
        access_token: response.data.access_token,
        // Spotify doesn't always return a new refresh token
        refresh_token: response.data.refresh_token || refreshToken,
        expires_in: response.data.expires_in
      };

      // Save the new tokens
      await this.saveTokens(tokens);

      return tokens;
    } catch (error) {
      logger.error('Error refreshing admin access token:', error);
      throw error;
    }
  }

  /**
   * Complete the OAuth process after receiving the authorization code
   *
   * @param {string} code Authorization code from Spotify
   * @returns {Promise<Object>} Tokens and user info
   */
  async handleAuthorizationCode(code) {
    try {
      const data = qs.stringify({
        code: code,
        redirect_uri: this.REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')
      };

      const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', data, { headers });

      // Get user information
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${tokenResponse.data.access_token}` }
      });

      const tokens = {
        access_token: tokenResponse.data.access_token,
        refresh_token: tokenResponse.data.refresh_token,
        expires_in: tokenResponse.data.expires_in,
        user_id: userResponse.data.id
      };

      // Save tokens to Redis
      await this.saveTokens(tokens);

      return {
        access_token: tokens.access_token,
        user_id: tokens.user_id
      };
    } catch (error) {
      logger.error('Error handling authorization code:', error);
      throw error;
    }
  }

  /**
   * Clear all admin credentials
   *
   * @returns {Promise<void>}
   */
  async clearCredentials() {
    try {
      const multi = this.redisClient.multi();
      multi.del(`${this.REDIS_KEY_PREFIX}access_token`);
      multi.del(`${this.REDIS_KEY_PREFIX}refresh_token`);
      multi.del(`${this.REDIS_KEY_PREFIX}user_id`);
      await multi.exec();
      this.initialized = false;
      logger.info('Admin credentials cleared from Redis');
    } catch (error) {
      logger.error('Error clearing admin credentials:', error);
      throw error;
    }
  }
}

module.exports = AdminAuthService;