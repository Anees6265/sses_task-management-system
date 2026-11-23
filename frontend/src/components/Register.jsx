import React, { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { departmentAPI } from '../services/api.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone, 
  FiBriefcase, 
  FiEye, 
  FiEyeOff, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiArrowRight,
  FiX
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

const Register = ({ onClose, isModal = false }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    department: '', 
    role: 'user', 
    phoneNumber: '+91 ', 
    telegramChatId: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDept, setCustomDept] = useState('');
  const { registerUser } = useContext(AuthContext);

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
      // Fallback to defaults
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameCheck = validateName(formData.name);
    if (!nameCheck.isValid) {
      setError(nameCheck.error);
      return;
    }

    const emailCheck = validateEmail(formData.email);
    if (!emailCheck.isValid) {
      setError(emailCheck.error);
      return;
    }

    const phoneCheck = validatePhoneNumber(formData.phoneNumber, true);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error);
      return;
    }

    const selectedDept = isCustomDept ? customDept.trim() : formData.department;
    if (formData.role !== 'admin' && !selectedDept) {
      setError('Please select or specify your academic department');
      return;
    }

    const passCheck = validatePassword(formData.password);
    if (!passCheck.isValid) {
      setError(passCheck.error);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const submitData = { 
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: phoneCheck.formatted,
        department: selectedDept
      };
      
      await registerUser(submitData);
      setSuccess('Account registered successfully!');
      setError('');
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6 relative">
        {isModal && onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
        
        {!isModal && (
          <div className="inline-flex p-2 bg-white rounded-2xl border border-slate-100 shadow-xs mb-3">
            <img 
              src={logo} 
              alt="SSES Logo" 
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-xl"
            />
          </div>
        )}
        
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          {isModal ? 'Register New User' : 'Create SSES Account'}
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          {isModal ? 'Add faculty or administrative user' : 'Academic Operations & Governance Portal'}
        </p>
      </div>

      {/* Alerts */}
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

      <form onSubmit={handleSubmit} className="space-y-3.5">
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneInput(e.target.value) })}
              required
            />
          </div>
        </div>

        {isModal && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role
            </label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 bg-white transition"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="user">Faculty Member (User)</option>
              <option value="hod">Head of Department (HOD)</option>
              <option value="admin">System Administrator (Admin)</option>
            </select>
          </div>
        )}

        {formData.role !== 'admin' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Department
            </label>
            {!isCustomDept ? (
              <div className="relative">
                <FiBriefcase className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <select
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 bg-white transition appearance-none"
                  value={formData.department}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomDept(true);
                    } else {
                      setFormData({ ...formData, department: e.target.value });
                    }
                  }}
                  required
                >
                  <option value="">Select Department</option>
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
                  placeholder="Type department designation"
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
                  ← Select from department list
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="8 to 18 characters"
              minLength={8}
              maxLength={18}
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm text-slate-800 placeholder-slate-400 bg-white transition"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
          <p className="text-[11px] text-slate-400 font-medium mt-1">Must be 8 to 18 characters</p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isModal ? 'Create Account' : 'Register Account'}</span>
                <FiArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return createPortal(
      <div 
        className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
          {formContent}
        </div>
      </div>,
      document.body
    );
  }

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

      <div className="w-full flex justify-center items-center my-auto relative z-10">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-orange-950/10 border border-orange-100/90 p-6 sm:p-8">
          {formContent}
        </div>
      </div>

      <footer className="text-center text-[11px] sm:text-xs text-slate-400 font-medium py-3 relative z-10">
        Sant Singaji Educational Society • Academic Management Portal
      </footer>
    </div>
  );
};

export default Register;
