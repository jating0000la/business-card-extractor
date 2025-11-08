import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
    // Handle authentication errors more carefully
    if (error.response?.status === 401) {
      // Only redirect if we're not already on login page and it's a definitive auth failure
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && error.response?.data?.error !== 'No token provided') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
      return Promise.reject(error);
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.');
      return Promise.reject(error);
    }
    
    // Handle network errors gracefully
    if (!error.response && error.code === 'ECONNREFUSED') {
      console.error('Backend server is not running');
      toast.error('Cannot connect to server. Please check if the backend is running.');
      return Promise.reject(error);
    }
    
    // Show error toast for other errors (but not for network issues during verification)
    if (error.response?.status >= 400 && error.config?.url !== '/auth/verify') {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  googleLogin: (token) => api.post('/auth/google', { token }),
  verify: () => api.post('/auth/verify'),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Card endpoints
export const cards = {
  process: (formData) => api.post('/cards/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params = {}) => api.get('/cards', { params }),
  getById: (id) => api.get(`/cards/${id}`),
  update: (id, data) => api.put(`/cards/${id}`, { data }),
  delete: (id) => api.delete(`/cards/${id}`),
  getStats: (period = '30d') => api.get(`/cards/stats/overview?period=${period}`),
  export: (format = 'csv', filename = '') => api.get(`/cards/export?format=${format}&filename=${filename}`, {
    responseType: 'blob'
  }),
};

// Admin endpoints
export const admin = {
  getUsers: (params = {}) => api.get('/admin', { params }),
  inviteUser: (data) => api.post('/admin/invite', data),
  updateUserRole: (userId, role) => api.put(`/admin/${userId}/role`, { role }),
  updateUserStatus: (userId, isActive) => api.put(`/admin/${userId}/status`, { isActive }),
  removeUser: (userId) => api.delete(`/admin/${userId}`),
  getUserStats: (userId, period = '30d') => api.get(`/admin/${userId}/stats?period=${period}`),
};

// Config endpoints
export const config = {
  // AI Configuration
  getAIConfig: () => api.get('/config/ai'),
  updateAIConfig: (data) => api.put('/config/ai', data),
  testAIConfig: () => api.post('/config/ai/test'),
  testConnection: (data) => api.post('/config/ai/test-connection', data),
  getAvailableModels: (data) => api.post('/config/ai/models', data),
  deleteAIConfig: () => api.delete('/config/ai'),
  
  // Webhook Configuration
  getWebhookConfig: () => api.get('/config/webhook'),
  updateWebhookConfig: (data) => api.put('/config/webhook', data),
  testWebhook: (testData) => api.post('/config/webhook/test', { testData }),
  getWebhookStats: () => api.get('/config/webhook/stats'),
  retryWebhooks: () => api.post('/config/webhook/retry'),
  deleteWebhookConfig: () => api.delete('/config/webhook'),
};

export default api;