import axios from 'axios';
import { isTokenExpired, refreshAccessToken, logout } from './authService';
import { server_url } from "../App";

const apiClient = axios.create({
  baseURL: server_url
});

// Request interceptor to handle token refreshing
apiClient.interceptors.request.use(
  async (config) => {
    // Only check for token expiration if this is a request that needs authorization
    if (config.headers.Authorization) {
      const needsRefresh = isTokenExpired();

      if (needsRefresh) {
        const refreshResult = await refreshAccessToken();

        if (refreshResult) {
          // Update the Authorization header with the new token
          config.headers.Authorization = `Bearer ${refreshResult.access_token}`;
        } else {
          // If refresh failed, log the user out
          logout();
          window.location.href = '/'; // Redirect to home
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;