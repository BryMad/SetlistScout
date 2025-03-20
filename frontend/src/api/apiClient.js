import axios from 'axios';
import { server_url } from "../App";

const apiClient = axios.create({
  baseURL: server_url,
  withCredentials: true
});

// Request interceptor to handle token refreshing
apiClient.interceptors.request.use(
  async (config) => {
    // No longer need to add tokens to the Authorization header
    // The session cookie will be automatically included
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      // Redirect to login or update auth state
      const authContext = useContext(AuthContext);
      if (authContext) {
        authContext.updateAuth();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;