import React, { useState, useEffect } from 'react';
import { authAPI, departmentAPI } from '../services/api.jsx';
import { toast } from 'react-toastify';
import { FiUserPlus, FiUser, FiMail, FiLock, FiBriefcase, FiPhone, FiCheckCircle } from 'react-icons/fi';
import { 
  validateEmail, 
  validatePhoneNumber, 
  validatePassword, 
  validateName, 
  formatPhoneInput 
} from '../utils/validation.js';
import { notifyDataRefresh } from '../utils/eventBus.js';

const CreateHOD = ({ onClose, isModal }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    phoneNumber: '+91 '
  });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments();
      if (data && Array.isArray(data)) {
        setDepartments(data);
        if (data.length > 0 && !formData.department) {
          const firstDept = typeof data[0] === 'object' ? data[0].name : data[0];
          setFormData(prev => ({ ...prev, department: firstDept }));
        }
      }
    } catch (err) {
      console.error('Error fetching departments in CreateHOD:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameCheck = validateName(formData.name);
    if (!nameCheck.isValid) {
      toast.error(nameCheck.error, { position: 'top-center' });
      return;
    }

    const emailCheck = validateEmail(formData.email);
    if (!emailCheck.isValid) {
      toast.error(emailCheck.error, { position: 'top-center' });
      return;
    }

    const passCheck = validatePassword(formData.password);
    if (!passCheck.isValid) {
      toast.error(passCheck.error, { position: 'top-center' });
      return;
    }

    if (!formData.department || !formData.department.trim()) {
      toast.error('Department is required', { position: 'top-center' });
      return;
    }

    const phoneCheck = validatePhoneNumber(formData.phoneNumber, true);
    if (!phoneCheck.isValid) {
      toast.error(phoneCheck.error || 'Please enter a valid 10-digit mobile number', { position: 'top-center' });
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        ...formData,
        department: formData.department.trim(),
        phoneNumber: phoneCheck.formatted,
        role: 'hod'
      });
      
      toast.success('HOD created successfully!', { position: 'top-center', autoClose: 2000 });
      setFormData({ name: '', email: '', password: '', department: '', phoneNumber: '+91 ' });
      notifyDataRefresh('departments');
      notifyDataRefresh('all');
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create HOD', { 
        position: 'top-center', 
        autoClose: 3000 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isModal ? '' : 'min-h-screen bg-slate-50 flex items-center justify-center p-4'}>
      <div className={isModal ? 'w-full' : 'bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100'}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FiUserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">
            Create Department HOD
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Add a new Head of Department to SSES</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Name *</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Full Name (e.g. Dr. Sunita Verma)"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email *</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="email"
                placeholder="hod.dept@ssism.org"
                pattern="[a-zA-Z0-9._%+\-]+@ssism\.org"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Must be @ssism.org email domain</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password *</label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="password"
                placeholder="Password (8-18 characters)"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                maxLength={18}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Must be 8 to 18 characters</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Department *</label>
            <div className="relative">
              <FiBriefcase className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              {departments.length > 0 ? (
                <select
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 bg-white"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(dept => {
                    const deptName = typeof dept === 'object' ? (dept.name || '') : String(dept || '');
                    return <option key={deptName} value={deptName}>{deptName}</option>;
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g., Computer Science, IT"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number * (10 Digits)</label>
            <div className="relative">
              <FiPhone className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="tel"
                placeholder="+91 9876543210"
                maxLength={15}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneInput(e.target.value) })}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Must be exactly 10 digits with +91 (e.g. +91 9876543210)</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
          >
            <FiCheckCircle className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Create HOD Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateHOD;
