import React, { useState, useContext } from 'react';
import { authAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';

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
        department: user.department // HOD's department
      });
      
      toast.success('✅ Faculty created successfully!', { position: 'top-center', autoClose: 2000 });
      setFormData({ name: '', email: '', password: '', phoneNumber: '' });
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Failed to create faculty', { 
        position: 'top-center', 
        autoClose: 3000 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isModal ? '' : 'min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4'}>
      <div className={isModal ? 'w-full' : 'bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md'}>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-gray-800">
          👨‍🏫 Add Faculty
        </h2>
        <p className="text-sm text-center text-gray-600 mb-6">
          Department: <span className="font-semibold text-orange-600">{user?.department}</span>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              placeholder="Enter faculty name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              placeholder="faculty@ssism.org"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Must be @ssism.org email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="Optional"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition text-sm"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Creating...' : '✅ Add Faculty'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateFaculty;
