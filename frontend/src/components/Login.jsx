import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      console.log('Attempting login with:', formData.email);
      console.log('API URL:', import.meta.env.VITE_API_URL || 'https://sses-task-backend.onrender.com/api');
      await login(formData);
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.message || err.message || 'Login failed - Cannot connect to server';
      setError(errorMsg);
      const actualApiUrl = import.meta.env.VITE_API_URL || 'https://sses-task-backend.onrender.com/api';
      alert(`Login Error: ${errorMsg}\n\nAPI: ${actualApiUrl}\nEmail: ${formData.email}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4">
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-sm md:text-base text-gray-500">Sign in to continue</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 md:p-3 rounded-lg mb-4 text-xs md:text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-sm md:text-base"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-sm md:text-base"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-sm md:text-base"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
