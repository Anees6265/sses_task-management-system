import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { FiClock, FiCheckCircle, FiLogOut, FiRefreshCw } from 'react-icons/fi';

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

    const interval = setInterval(checkTokenExpiry, 10000);
    checkTokenExpiry();

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 border border-slate-100 text-center fade-in">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <FiClock className="w-8 h-8" />
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-1">
          Session Expiring Soon
        </h2>
        <p className="text-xs text-slate-500 font-semibold mb-4">
          Your active session will expire in
        </p>
        
        <div className="text-4xl md:text-5xl font-extrabold text-orange-500 mb-2 tracking-tight">
          {formatTime(countdown)}
        </div>
        
        <p className="text-slate-400 text-xs font-medium mb-6">
          Click "Extend Session" to stay logged in securely
        </p>

        <div className="space-y-3">
          <button
            onClick={handleContinue}
            disabled={isExtending}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isExtending ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiCheckCircle className="w-4 h-4" />}
            <span>{isExtending ? 'Extending Session...' : 'Extend Session'}</span>
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isExtending}
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Logout Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenExpiryWarning;
