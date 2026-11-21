import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';
import api, { departmentAPI } from '../services/api.jsx';
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone, 
  FiBriefcase, 
  FiArrowRight, 
  FiEye, 
  FiEyeOff, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSend,
  FiRefreshCw
} from 'react-icons/fi';
import { 
  validateEmail, 
  validatePhoneNumber, 
  validatePassword, 
  validateName, 
  formatPhoneInput 
} from '../utils/validation.js';

const DEFAULT_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Comm.',
  'Management',
  'Mechanical Engineering',
  'Basic Sciences'
];

const Login = () => {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [signinType, setSigninType] = useState('password'); // 'password' | 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
  // Sign in state
  const [signinData, setSigninData] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  // Sign up state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    phoneNumber: '+91 ',
    department: '',
    password: '',
    role: 'user'
  });
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDept, setCustomDept] = useState('');
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);

  // Common UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useContext(AuthContext);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await (departmentAPI.getPublicDepartments ? departmentAPI.getPublicDepartments() : departmentAPI.getAllDepartments());
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const cleanList = res.data.map(d => (typeof d === 'object' ? d.name : d)).filter(Boolean);
        if (cleanList.length > 0) {
          setDepartments(cleanList);
        }
      }
    } catch {
      // Fallback to default departments list
    }
  };

  // 1. Handle Password Sign In
  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    const emailCheck = validateEmail(signinData.email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error);
      return;
    }
    if (!signinData.password) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(signinData);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    const emailCheck = validateEmail(signinData.email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: signinData.email });
      setOtpSent(true);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Unable to send OTP. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email: signinData.email, otp });
      localStorage.setItem('accessToken', data.accessToken || data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data));
      window.location.reload();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid passcode. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Create Account (Sign Up)
  const handleSignUp = async (e) => {
    e.preventDefault();

    const nameCheck = validateName(signupData.name);
    if (!nameCheck.isValid) {
      setError(nameCheck.error);
      return;
    }

    const emailCheck = validateEmail(signupData.email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error);
      return;
    }

    const phoneCheck = validatePhoneNumber(signupData.phoneNumber, true);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error);
      return;
    }

    const selectedDept = isCustomDept ? customDept.trim() : signupData.department;
    if (!selectedDept) {
      setError('Please select or specify your academic department');
      return;
    }

    const passCheck = validatePassword(signupData.password);
    if (!passCheck.isValid) {
      setError(passCheck.error);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload = {
        name: signupData.name.trim(),
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        phoneNumber: phoneCheck.formatted,
        department: selectedDept,
        role: 'user'
      };

      await register(payload);
      setSuccess('Account created successfully! Redirecting...');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed. Please check your details.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-orange-100/70 relative flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden">
      {/* Pattern overlay: Grid + Dots */}
      <div className="absolute inset-0 bg-orange-grid-pattern opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-orange-dots-pattern opacity-40 pointer-events-none" />

      {/* Decorative ambient glowing orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/35 to-amber-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-gradient-to-tl from-orange-500/30 to-amber-400/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-orange-300/15 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative concentric geometric rings */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-orange-200/60 pointer-events-none hidden md:block" />
      <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full border border-orange-300/40 pointer-events-none hidden md:block" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-orange-200/60 pointer-events-none hidden md:block" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full border border-orange-300/40 pointer-events-none hidden md:block" />

      {/* Decorative floating orange particles */}
      <div className="absolute top-1/4 left-10 w-3 h-3 bg-orange-400/40 rounded-full blur-[1px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-12 w-4 h-4 bg-amber-500/30 rounded-full blur-[1px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 bg-orange-500/35 rounded-full blur-[1px] pointer-events-none" />

      <div className="w-full flex justify-center items-center my-auto relative z-10">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-orange-950/10 border border-orange-100/90 p-6 sm:p-8 transition-all">
          
          {/* Institution Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-2 bg-white rounded-2xl border border-orange-100 shadow-sm shadow-orange-500/5 mb-3">
              <img 
                src={logo} 
                alt="SSES Logo" 
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-xl"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Sant Singaji Educational Society
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {authMode === 'signin' 
                ? 'Academic Operations & Governance Portal' 
                : 'Create Academic Faculty & Staff Account'}
            </p>
          </div>

          {/* SIGN IN: Mode Switch (Password vs OTP) */}
          {authMode === 'signin' && (
            <div className="flex bg-slate-100/90 p-1 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setSigninType('password');
                  setOtpSent(false);
                  setError('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  signinType === 'password'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiLock className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSigninType('otp');
                  setOtpSent(false);
                  setError('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  signinType === 'otp'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FiSend className="w-3.5 h-3.5" />
                <span>Email OTP</span>
              </button>
            </div>
          )}

          {/* Error & Success Messages */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm p-3 rounded-xl mb-4 flex items-center gap-2.5">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm p-3 rounded-xl mb-4 flex items-center gap-2.5">
              <FiCheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span className="flex-1">{success}</span>
            </div>
          )}

          {/* SIGN IN VIEW */}
          {authMode === 'signin' ? (
            <div>
              {signinType === 'password' ? (
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                      <input
                        type="email"
                        placeholder="yourname@ssism.org"
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                        value={signinData.email}
                        onChange={(e) => setSigninData({ ...signinData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                        value={signinData.password}
                        onChange={(e) => setSigninData({ ...signinData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <FiArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* OTP SIGN IN */
                <>
                  {!otpSent ? (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Institutional Email
                        </label>
                        <div className="relative">
                          <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                          <input
                            type="email"
                            placeholder="yourname@ssism.org"
                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                            value={signinData.email}
                            onChange={(e) => setSigninData({ ...signinData, email: e.target.value })}
                            required
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                          A 6-digit one-time passcode will be sent to your email.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <FiSend className="w-4 h-4" />
                            <span>Send One-Time Passcode</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div className="text-center p-3 bg-orange-50/70 border border-orange-200/60 rounded-xl">
                        <p className="text-xs text-slate-600">
                          Passcode sent to <strong className="text-slate-800">{signinData.email}</strong>
                        </p>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-[11px] font-semibold text-orange-600 hover:underline mt-1"
                        >
                          Change email
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                          Enter 6-Digit Passcode
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          className="w-full py-3 px-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-center text-xl font-extrabold tracking-[0.3em] text-slate-800 bg-white transition"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Verify & Sign In</span>
                        )}
                      </button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          disabled={loading}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <FiRefreshCw className="w-3.5 h-3.5" />
                          <span>Resend Passcode</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              <div className="mt-6 text-center text-xs text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setError('');
                  }}
                  className="font-bold text-orange-600 hover:underline"
                >
                  Create Account
                </button>
              </div>
            </div>
          ) : (
            /* CREATE ACCOUNT (SIGN UP) VIEW */
            <div>
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. Prof. Rajesh Verma"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      placeholder="username@ssism.org"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Must end with @ssism.org</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      maxLength={15}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                      value={signupData.phoneNumber}
                      onChange={(e) => setSignupData({ ...signupData, phoneNumber: formatPhoneInput(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Department
                  </label>
                  {!isCustomDept ? (
                    <div className="relative">
                      <FiBriefcase className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                      <select
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 bg-white transition appearance-none"
                        value={signupData.department}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomDept(true);
                          } else {
                            setSignupData({ ...signupData, department: e.target.value });
                          }
                        }}
                        required
                      >
                        <option value="">Select your department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        <option value="__custom__">+ Other / Custom Department</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Type department name"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 bg-white transition"
                        value={customDept}
                        onChange={(e) => setCustomDept(e.target.value)}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomDept(false);
                          setCustomDept('');
                        }}
                        className="text-xs text-orange-600 hover:underline font-semibold"
                      >
                        ← Choose from list
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder="8 to 18 characters"
                      minLength={8}
                      maxLength={18}
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showSignupPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Minimum 8 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <FiArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError('');
                  }}
                  className="font-bold text-orange-600 hover:underline"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] sm:text-xs text-slate-400 font-medium py-3 relative z-10">
        Sant Singaji Educational Society • Academic Management Portal
      </footer>
    </div>
  );
};

export default Login;
