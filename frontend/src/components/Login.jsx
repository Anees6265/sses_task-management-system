import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';
import api from '../services/api.jsx';
import { 
  FiMail, 
  FiLock, 
  FiKey, 
  FiArrowRight, 
  FiShield, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSend,
  FiRefreshCw
} from 'react-icons/fi';

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
      setOtpSent(true);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send OTP.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email: formData.email, otp });
      localStorage.setItem('token', data.accessToken || data.token);
      localStorage.setItem('user', JSON.stringify(data));
      window.location.reload();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader />}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-4 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-white/95 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 relative z-10 fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-2xl shadow-lg shadow-orange-500/20 mb-4">
              <img 
                src={logo}
                alt="Singaji Educational Society Logo" 
                className="h-16 w-16 object-contain bg-white rounded-xl p-1"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">SSES Portal</h1>
            <p className="text-xs md:text-sm font-semibold text-slate-500 mt-1">Task & Operations Management System</p>
          </div>
          
          {/* Tab Selection */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => { setLoginMode('password'); setOtpSent(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm transition flex items-center justify-center gap-2 ${
                loginMode === 'password' 
                  ? 'bg-white text-orange-600 shadow-md shadow-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiLock className="w-4 h-4" />
              <span>Password</span>
            </button>
            <button
              onClick={() => { setLoginMode('otp'); setOtpSent(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm transition flex items-center justify-center gap-2 ${
                loginMode === 'otp' 
                  ? 'bg-white text-orange-600 shadow-md shadow-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiKey className="w-4 h-4" />
              <span>Email OTP</span>
            </button>
          </div>
          
          {error && (
            <div className="bg-rose-50 border border-rose-200/80 text-rose-600 p-3.5 rounded-2xl mb-5 text-xs md:text-sm font-semibold flex items-center gap-2.5 animate-bounce">
              <FiAlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
          
          {loginMode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="name@ssism.org"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm md:text-base active:scale-98"
              >
                <span>Sign In</span>
                <FiArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                      <input
                        type="email"
                        placeholder="name@ssism.org"
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 transition"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm md:text-base active:scale-98"
                  >
                    <FiSend className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-2xl mb-4 text-xs md:text-sm font-semibold flex items-center gap-2">
                    <FiCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>OTP sent to {formData.email}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 text-center">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="123456"
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-400 text-slate-800 font-extrabold text-center text-2xl tracking-[0.3em] transition"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength="6"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm md:text-base active:scale-98"
                  >
                    <FiShield className="w-5 h-5" />
                    <span>Verify & Login</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-orange-600 text-xs font-bold hover:underline flex items-center justify-center gap-1 mt-2"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP Code</span>
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-slate-400" />
              <span>Protected by SSES Security Protocol</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
