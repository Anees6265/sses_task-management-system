import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { departmentAPI } from '../services/api.jsx';
import { 
  validateEmail, 
  validatePhoneNumber, 
  validatePassword, 
  validateName, 
  formatPhoneInput 
} from '../utils/validation.js';

const Register = ({ onClose, isModal = false }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', department: '', role: 'user', phoneNumber: '', telegramChatId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState(['ITEG', 'MEG', 'BEG', 'B.Tech']);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDepartment, setCustomDepartment] = useState('');
  const { registerUser } = useContext(AuthContext);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments();
      if (data && data.length > 0) {
        setDepartments(data);
      }
    } catch (error) {
      console.log('Using default departments');
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

    const passCheck = validatePassword(formData.password);
    if (!passCheck.isValid) {
      setError(passCheck.error);
      return;
    }

    try {
      const submitData = { 
        ...formData,
        phoneNumber: phoneCheck.formatted
      };
      if (showCustomInput && customDepartment) {
        submitData.department = customDepartment.trim();
      }
      await registerUser(submitData);
      setSuccess('User registered successfully!');
      setError('');
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setSuccess('');
    }
  };

  const containerClass = isModal 
    ? "" 
    : "min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4";
  
  const cardClass = isModal
    ? ""
    : "bg-white p-6 md:p-10 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100";

  return (
    <div className={containerClass}>
      <div className={cardClass}>
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">Register New User</h1>
          <p className="text-gray-500 text-xs md:text-sm">Create a new account</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 md:p-3 rounded-lg mb-3 md:mb-4 text-xs md:text-sm break-words">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-2 md:p-3 rounded-lg mb-3 md:mb-4 text-xs md:text-sm break-words">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Full Name *</label>
              <input
                type="text"
                placeholder="Full Name (e.g. Rahul Sharma)"
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Email *</label>
              <input
                type="email"
                placeholder="username@ssism.org"
                pattern="[a-zA-Z0-9._%+\-]+@ssism\.org"
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
                value={formData.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setFormData({ ...formData, email });
                  if (email && !email.toLowerCase().endsWith('@ssism.org')) {
                    setError('Only @ssism.org email addresses are allowed');
                  } else {
                    setError('');
                  }
                }}
                required
              />
              <p className="text-[11px] text-gray-400 font-semibold mt-1">Must be an @ssism.org email address</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Mobile Number *</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                maxLength={15}
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneInput(e.target.value) })}
                required
              />
              <p className="text-[11px] text-gray-400 font-semibold mt-1">+91 country code & 10 digits required</p>
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Password *</label>
              <input
                type="password"
                placeholder="Password (8-18 characters)"
                className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                maxLength={18}
              />
              <p className="text-[11px] text-gray-400 font-semibold mt-1">Must be 8 to 18 characters</p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Role</label>
            <select
              className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="user">👤 User</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>
          
          {formData.role === 'user' && (
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Department</label>
              {!showCustomInput ? (
                <div className="space-y-2">
                  <select
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Add Custom
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter custom department"
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition text-xs md:text-sm"
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomDepartment('');
                    }}
                    className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 md:gap-3 pt-2 md:pt-4">
            <button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 md:py-2.5 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-md text-xs md:text-sm"
            >
              Create Account
            </button>
            {isModal && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 bg-gray-100 text-gray-700 py-2 md:py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-xs md:text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
