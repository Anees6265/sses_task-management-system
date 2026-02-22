import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import Register from './Register.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useContext(AuthContext);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 shadow-sm fixed left-0 right-0 z-50" style={{ top: 'env(safe-area-inset-top, 0px)', paddingTop: '12px', paddingBottom: '12px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center space-x-2 md:space-x-3">
              <img 
                src={logo}
                alt="SSISM Logo" 
                className="h-8 w-8 md:h-10 md:w-10 object-contain rounded bg-white p-1"
              />
              <span className="hidden sm:inline">Sant Singaji Educational Society</span>
              <span className="sm:hidden">SSES</span>
            </h1>
            {user?.role !== 'admin' && (
              <span className="text-xs md:text-sm text-gray-500 hidden md:block">
                {user?.department} Department
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-2 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition font-medium text-xs md:text-sm flex items-center space-x-1 shadow-sm"
              >
                <span className="text-base">👤</span>
                <span className="hidden sm:inline">Register</span>
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs md:text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? '👑 Admin' : user?.department}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-2 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition font-medium text-xs md:text-sm shadow-sm"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">🚪</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition"
            >
              <span className="text-3xl font-light">×</span>
            </button>
            <div className="p-8">
              <Register onClose={() => setShowRegisterModal(false)} isModal={true} />
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-3">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-800">Logout?</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 md:py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition text-xs md:text-base"
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-xs md:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
