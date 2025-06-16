import axios from 'axios';
import { auth } from '@/config/firebase';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
});

// Interceptor to add the Firebase auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting auth token:", error);
        // Don't send a request without a token if one is expected
        return Promise.reject(new Error("Could not authenticate user."));
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to standardize error messages from the backend
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message;
    return Promise.reject(new Error(message));
  }
);

export default apiClient;