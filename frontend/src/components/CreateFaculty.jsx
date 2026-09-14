import React, { useState, useContext } from 'react';
import { authAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUserPlus, FiUser, FiMail, FiLock, FiPhone, FiCheckCircle } from 'react-icons/fi';

const CreateFaculty = ({ onClose, isModal }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.register({
        ...formData,
        role: 'user',
        department: user.department
      });
      
      toast.success('Faculty created successfully!', { position: 'top-center', autoClose: 2000 });
      setFormData({ name: '', email: '', password: '', phoneNumber: '' });
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create faculty', { 
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
            Add Department Faculty
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Department: <span className="font-bold text-orange-600">{user?.department}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Name *</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Prof. John Von Neumann"
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
                placeholder="faculty@ssism.org"
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
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number</label>
            <div className="relative">
              <FiPhone className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
              <input
                type="tel"
                placeholder="+91 9876543210"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
          >
            <FiCheckCircle className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Add Faculty Member'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateFaculty;
