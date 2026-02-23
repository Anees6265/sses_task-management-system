import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';
import api from '../services/api.jsx';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('password');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const { login } = useContext(AuthContext);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!formData.email.endsWith('@ssism.org')) {
      setError('Only @ssism.org email addresses are allowed');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { email: formData.email });
      console.log('OTP sent successfully:', response.data);
      setOtpSent(true);
      setError('');
    } catch (err) {
      console.error('OTP send error:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send OTP';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email: formData.email, otp });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader />}
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={logo}
              alt="Singaji Educational Society Logo" 
              className="h-20 w-20 md:h-24 md:w-24 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-sm md:text-base text-gray-500">Sign in to continue</p>
        </div>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setLoginMode('password'); setOtpSent(false); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${
              loginMode === 'password' 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => { setLoginMode('otp'); setOtpSent(false); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${
              loginMode === 'otp' 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            OTP
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 md:p-3 rounded-lg mb-4 text-xs md:text-sm">
            {error}
          </div>
        )}
        
        {loginMode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4 md:space-y-5">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Email Address</label>
              <input
                type="email"
                placeholder="Enter your @ssism.org email"
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
        ) : (
          <>
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your @ssism.org email"
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-sm md:text-base"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-sm md:text-base"
                >
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4 md:space-y-5">
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-xs md:text-sm">
                  OTP sent to {formData.email}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">Enter OTP</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-sm md:text-base text-center text-2xl tracking-widest"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength="6"
                    autoComplete="one-time-code"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg text-sm md:text-base"
                >
                  Verify OTP
                </button>
                
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-orange-600 text-sm hover:text-orange-700 font-medium"
                >
                  Resend OTP
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default Login;
