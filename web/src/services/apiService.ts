import axios from 'axios';
import { auth } from '@/config/firebase';
import { TaskStatus } from '@/types/api';
import { pollTask } from '@/services/useMarketData';

const apiClient = axios.create({
    baseURL: '/api/v1'
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

export const searchStocks = async (query: string) => {
  if (!query) throw new Error("Query is required.");

  const { data: task } = await apiClient.post<TaskStatus>(`/search`, { query });

  const result = await pollTask(task.task_id);

  return result;
};
