import React, { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import CreateHOD from './CreateHOD.jsx';
import CreateFaculty from './CreateFaculty.jsx';
import FacultyProfileModal from './FacultyProfileModal.jsx';
import logo from '../assets/images/singaji_educational_society_logo.jpg';
import { 
  FiMenu, 
  FiGlobe, 
  FiPlusCircle, 
  FiUserPlus, 
  FiUser, 
  FiSettings, 
  FiLogOut, 
  FiX, 
  FiShield, 
  FiBriefcase,
  FiChevronDown,
  FiMail
} from 'react-icons/fi';

const Navbar = ({ onMenuClick, onFacultyCreated, onOpenProfile }) => {
  const { user, logout } = useContext(AuthContext);
  const { language, toggleLanguage, t } = useLanguage();
  const [showCreateHODModal, setShowCreateHODModal] = useState(false);
  const [showCreateFacultyModal, setShowCreateFacultyModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFacultyProfileModal, setShowFacultyProfileModal] = useState(false);

  const userMenuRef = useRef(null);

  // Close profile popup when clicking anywhere outside on the screen or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
        setShowCreateHODModal(false);
        setShowCreateFacultyModal(false);
        setShowSettingsModal(false);
        setShowLogoutConfirm(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      
      <nav className="glass-panel border-b border-slate-200/80 px-3 md:px-6 shadow-sm fixed left-0 right-0 z-50 min-h-[60px] md:h-[68px] flex items-center" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition"
              aria-label="Toggle menu"
            >
              <FiMenu className="w-6 h-6" />
            </button>
            
            <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center space-x-2.5">
              <div className="p-1 bg-white border border-slate-200/90 rounded-xl shadow-xs flex items-center justify-center">
                <img 
                  src={logo}
                  alt="Sant Singaji Educational Society Logo" 
                  className="h-8 w-8 md:h-9 md:w-9 object-contain rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="hidden sm:inline font-extrabold text-slate-900 tracking-tight text-base md:text-lg">
                  Sant Singaji Educational Society
                </span>
                <span className="sm:hidden font-extrabold text-slate-900">SSES Portal</span>
                <span className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase hidden sm:block">
                  Academic Operations Portal
                </span>
              </div>
            </h1>

            {user?.role === 'admin' ? (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200/80 text-purple-800 text-xs font-bold rounded-full">
                <FiShield className="w-3.5 h-3.5 text-purple-600" />
                Dean / Admin
              </span>
            ) : user?.role === 'hod' ? (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold rounded-full">
                <FiBriefcase className="w-3.5 h-3.5 text-amber-600" />
                HOD • {user?.department}
              </span>
            ) : (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold rounded-full">
                <FiUser className="w-3.5 h-3.5 text-blue-600" />
                Faculty • {user?.department}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <button
              onClick={toggleLanguage}
              title="Switch portal interface language"
              className="px-2.5 md:px-3.5 py-1.5 md:py-2 bg-slate-100/90 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-xs md:text-sm flex items-center gap-1.5 border border-slate-200/80"
            >
              <FiGlobe className="w-4 h-4 text-orange-500" />
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowCreateHODModal(true)}
                className="px-3 md:px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition font-bold text-xs md:text-sm flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95"
              >
                <FiPlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">+ Register Department</span>
                <span className="sm:hidden">+ Dept</span>
              </button>
            )}
            
            {user?.role === 'hod' && (
              <button
                onClick={() => setShowCreateFacultyModal(true)}
                className="px-3 md:px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition font-bold text-xs md:text-sm flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95"
              >
                <FiUserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">+ Add Faculty Member</span>
                <span className="sm:hidden">+ Faculty</span>
              </button>
            )}
            
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Account menu and profile"
              >
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-md shadow-orange-500/20 border-2 border-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <FiChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden fade-in">
                  <div className="p-4 bg-gradient-to-br from-orange-50/90 via-amber-50/60 to-white border-b border-slate-100">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-2.5 shadow-md shadow-orange-500/20 border-2 border-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-center leading-tight capitalize text-sm md:text-base">{user?.name}</h3>
                      <p className="text-xs text-slate-500 text-center mt-0.5 font-medium">{user?.email}</p>
                      
                      {user?.role === 'admin' && (
                        <span className="mt-2.5 px-3 py-1 bg-purple-100 text-purple-800 text-[11px] rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 border border-purple-200">
                          <FiShield className="w-3 h-3 text-purple-600" /> Academic Dean / Admin
                        </span>
                      )}
                      {user?.role === 'hod' && (
                        <span className="mt-2.5 px-3 py-1 bg-amber-100 text-amber-800 text-[11px] rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 border border-amber-200">
                          <FiBriefcase className="w-3 h-3 text-amber-600" /> Head of Department (HOD)
                        </span>
                      )}
                      {user?.role === 'user' && (
                        <span className="mt-2.5 px-3 py-1 bg-blue-100 text-blue-800 text-[11px] rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 border border-blue-200">
                          <FiUser className="w-3 h-3 text-blue-600" /> Academic Faculty ({user?.department || 'Department'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onOpenProfile) {
                          onOpenProfile();
                        } else {
                          setShowFacultyProfileModal(true);
                        }
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-orange-600 rounded-xl transition text-xs md:text-sm font-semibold cursor-pointer"
                    >
                      <FiUser className="w-4 h-4 text-orange-500" />
                      <span>My Profile & Leave Ledger</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowSettingsModal(true);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition text-xs md:text-sm font-semibold cursor-pointer"
                    >
                      <FiSettings className="w-4 h-4 text-slate-500" />
                      <span>Account Credentials & Security</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs md:text-sm font-semibold cursor-pointer"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>Terminate Session (Sign Out)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Faculty Profile Modal */}
      {showFacultyProfileModal && (
        <FacultyProfileModal
          faculty={user}
          onClose={() => setShowFacultyProfileModal(false)}
        />
      )}

      {/* Create HOD Modal */}
      {showCreateHODModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateHODModal(false); }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto max-h-[90vh] overflow-y-auto relative border border-slate-100 fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateHODModal(false)}
              className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div className="p-6 md:p-8">
              <CreateHOD onClose={() => setShowCreateHODModal(false)} isModal={true} />
            </div>
          </div>
        </div>
      )}

      {/* Create Faculty Modal */}
      {showCreateFacultyModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateFacultyModal(false); }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-auto max-h-[90vh] overflow-y-auto relative border border-slate-100 fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateFacultyModal(false)}
              className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div className="p-6 md:p-8">
              <CreateFaculty onClose={() => {
                setShowCreateFacultyModal(false);
                if (onFacultyCreated) onFacultyCreated();
              }} isModal={true} />
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettingsModal(false); }}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                <FiSettings className="w-5 h-5 text-orange-500" />
                <span>{t('updateProfile')}</span>
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('name')}
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    defaultValue={user?.name}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {t('email')}
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    defaultValue={user?.email}
                    pattern="[a-zA-Z0-9._%+\-]+@ssism\.org"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Must be an @ssism.org email domain</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition text-sm shadow-md shadow-orange-500/20"
                >
                  {t('update')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiLogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">{t('logout')}?</h3>
            <p className="text-xs md:text-sm text-slate-500 mb-6">{t('logoutConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition text-sm shadow-md shadow-rose-600/20"
              >
                {t('logout')}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
