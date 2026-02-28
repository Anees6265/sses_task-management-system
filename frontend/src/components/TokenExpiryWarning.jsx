import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-management-system.onrender.com/api';

const TokenExpiryWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const { logout } = useContext(AuthContext);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    const checkTokenExpiry = () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;

      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeLeft = expiryTime - currentTime;

        // Show warning 5 minutes (300000ms) before expiry
        if (timeLeft <= 300000 && timeLeft > 0) {
          setShowWarning(true);
          setCountdown(Math.floor(timeLeft / 1000));
        } else if (timeLeft <= 0) {
          handleAutoLogout();
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    };

    const interval = setInterval(checkTokenExpiry, 10000); // Check every 10 seconds
    checkTokenExpiry(); // Initial check

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showWarning) return;

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleAutoLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showWarning]);

  const handleContinue = async () => {
    setIsExtending(true);
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
      
      localStorage.setItem('accessToken', data.accessToken);
      setShowWarning(false);
      setCountdown(300);
    } catch (error) {
      console.error('Token refresh failed:', error);
      handleAutoLogout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleAutoLogout = async () => {
    setShowWarning(false);
    await logout();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-bounce-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            ⏰ Session Expiring Soon
          </h2>
          <p className="text-gray-600 text-sm md:text-base mb-4">
            Your session will expire in
          </p>
          <div className="text-4xl md:text-5xl font-bold text-orange-500 mb-2">
            {formatTime(countdown)}
          </div>
          <p className="text-gray-500 text-xs md:text-sm">
            Click "Continue" to extend your session
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleContinue}
            disabled={isExtending}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExtending ? '⏳ Extending...' : '✅ Continue Session'}
          </button>
          <button
            onClick={handleLogout}
            disabled={isExtending}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚪 Logout
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Auto-logout in {formatTime(countdown)} if no action taken
        </p>
      </div>
    </div>
  );
};

export default TokenExpiryWarning;
