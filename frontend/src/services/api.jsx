import axios from 'axios';

// PRODUCTION: Use your deployed backend URL
// Replace 'your-backend' with your actual Render app name
const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-backend.onrender.com/api';

console.log('=== API Configuration ===');
console.log('API_URL:', API_URL);
console.log('Environment:', import.meta.env.MODE);

const api = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 second timeout for slow connections
  withCredentials: false // Important for CORS
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

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.message);
    console.error('Error config:', error.config);
    
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received.');
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
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
