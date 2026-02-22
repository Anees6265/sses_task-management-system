import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import Register from './Register.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useContext(AuthContext);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 shadow-sm fixed left-0 right-0 top-0 z-50 h-[65px] flex items-center">
        <div className="flex items-center justify-between w-full">
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
                className="px-2 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition font-medium text-xs md:text-sm flex items-center justify-center shadow-sm"
              >
                <span>Register</span>
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base hover:shadow-lg transition cursor-pointer"
              >
                {user?.name?.charAt(0).toUpperCase()}
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-gray-200">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="font-semibold text-gray-800 text-center">{user?.name}</h3>
                        <p className="text-xs text-gray-600 text-center">{user?.email}</p>
                        {user?.role === 'admin' && (
                          <span className="mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Admin</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm"
                      >
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                      >
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
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

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-3">
          <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg md:text-xl font-bold mb-4 text-gray-800">Update Profile</h3>
            <form className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  defaultValue={user?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={user?.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition text-sm"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
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
