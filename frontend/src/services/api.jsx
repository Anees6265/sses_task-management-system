import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// PRODUCTION: Use your deployed backend URL
const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-management-system.onrender.com/api';

console.log('=== API Configuration ===');
console.log('API_URL:', API_URL);
console.log('Platform:', Capacitor.getPlatform());
console.log('Is Native:', Capacitor.isNativePlatform());

// Create axios instance with mobile-friendly config
const api = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
  withCredentials: false
});

// Request interceptor
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  console.log('Making request to:', config.baseURL + config.url);
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor with token refresh
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken } = data;
        
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    console.error('❌ API Error:', error.message);
    
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response - Network issue');
      console.error('URL:', error.config?.baseURL + error.config?.url);
      console.error('Method:', error.config?.method);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API with error handling
export const authAPI = {
  register: async (data) => {
    try {
      console.log('Registering user...');
      return await api.post('/auth/register', data);
    } catch (error) {
      console.error('Register failed:', error);
      throw error;
    }
  },
  
  login: async (data) => {
    try {
      console.log('Logging in user:', data.email);
      const response = await api.post('/auth/login', data);
      console.log('Login successful');
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  sendOTP: async (email) => {
    try {
      console.log('Sending OTP to:', email);
      const response = await api.post('/auth/send-otp', { email });
      console.log('OTP sent successfully');
      return response;
    } catch (error) {
      console.error('Send OTP failed:', error);
      throw error;
    }
  },
  
  verifyOTP: async (email, otp) => {
    try {
      console.log('Verifying OTP for:', email);
      const response = await api.post('/auth/verify-otp', { email, otp });
      console.log('OTP verified successfully');
      return response;
    } catch (error) {
      console.error('Verify OTP failed:', error);
      throw error;
    }
  },
  
  getMe: async () => {
    try {
      return await api.get('/auth/me');
    } catch (error) {
      console.error('Get user failed:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      return await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }
};

export const taskAPI = {
  getTasks: () => api.get('/tasks'),
  getTasksByFaculty: (facultyId) => api.get(`/tasks/faculty/${facultyId}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  getDashboardStats: () => api.get('/tasks/stats')
};

export const userAPI = {
  getAllUsers: () => api.get('/users')
};

export const departmentAPI = {
  getAllDepartments: () => api.get('/departments')
};

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (userId) => api.get(`/chat/messages/${userId}`),
  sendMessage: (data) => api.post('/chat/send', data),
  markAsRead: (userId) => api.put(`/chat/read/${userId}`)
};

// Socket.IO connection helper
export const getSocketUrl = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-management-system.onrender.com/api';
  return API_URL.replace('/api', '');
};

export const notificationAPI = {
  saveFCMToken: (token) => api.post('/notifications/fcm-token', { fcmToken: token }),
  updatePreferences: (prefs) => api.put('/notifications/preferences', prefs)
};

export default api;
