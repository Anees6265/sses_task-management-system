import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// PRODUCTION: Use your deployed backend URL
const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-backend.onrender.com/api';

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
api.interceptors.request.use((config) => {
  console.log('Making request to:', config.baseURL + config.url);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor with detailed logging
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status);
    return response;
  },
  (error) => {
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
  
  getMe: async () => {
    try {
      return await api.get('/auth/me');
    } catch (error) {
      console.error('Get user failed:', error);
      throw error;
    }
  }
};

export const taskAPI = {
  getTasks: () => api.get('/tasks'),
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

export default api;
