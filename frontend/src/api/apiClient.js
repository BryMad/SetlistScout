// src/api/apiClient.js - NEW FILE

import axios from 'axios';
import { server_url } from "../App";

/**
 * Create a configured axios instance for API requests
 * - Includes credentials (cookies) by default
 * - Configured with base URL
 */
const apiClient = axios.create({
  baseURL: server_url,
  withCredentials: true, // Always include cookies for session-based auth
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Add error handling interceptor
 * - Centralizes error handling
 * - Can trigger auth-related actions on 401
 */
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Log errors
    console.error('API request error:', error.message);

    // You could add global error handling here
    // e.g., redirecting to login page on 401 or showing notifications

    return Promise.reject(error);
  }
);

export default apiClient;