import React, { useContext, useState } from 'react';
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

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-30" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      
      <nav className="glass-panel border-b border-slate-200/80 px-3 md:px-6 shadow-sm fixed left-0 right-0 z-30 min-h-[60px] md:h-[68px] flex items-center" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
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
              <div className="p-1 bg-white border border-slate-200/80 rounded-xl shadow-xs flex items-center justify-center">
                <img 
                  src={logo}
                  alt="SSISM Logo" 
                  className="h-7 w-7 md:h-8 md:w-8 object-contain rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <span className="hidden sm:inline font-extrabold text-slate-900 tracking-tight text-base md:text-lg">
                  Sant Singaji Educational Society
                </span>
                <span className="sm:hidden font-extrabold text-slate-900">SSES</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase hidden sm:block">
                  Task Management Portal
                </span>
              </div>
            </h1>

            {user?.role !== 'admin' && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-semibold rounded-full">
                <FiBriefcase className="w-3.5 h-3.5" />
                {user?.department} Dept
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <button
              onClick={toggleLanguage}
              className="px-2.5 md:px-3.5 py-1.5 md:py-2 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 rounded-xl transition font-semibold text-xs md:text-sm flex items-center gap-1.5 border border-slate-200/60"
            >
              <FiGlobe className="w-4 h-4 text-orange-500" />
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowCreateHODModal(true)}
                className="px-3 md:px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition font-semibold text-xs md:text-sm flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95"
              >
                <FiPlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Department</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
            
            {user?.role === 'hod' && (
              <button
                onClick={() => setShowCreateFacultyModal(true)}
                className="px-3 md:px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition font-semibold text-xs md:text-sm flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95"
              >
                <FiUserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Faculty</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-md shadow-orange-500/20 border-2 border-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <FiChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-3 w-64 max-w-[85vw] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden fade-in">
                    <div className="p-4 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-white border-b border-slate-100">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-2.5 shadow-md shadow-orange-500/20">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="font-bold text-slate-800 text-center leading-tight">{user?.name}</h3>
                        <p className="text-xs text-slate-500 text-center mt-0.5">{user?.email}</p>
                        
                        {user?.role === 'admin' && (
                          <span className="mt-2.5 px-3 py-0.5 bg-orange-100 text-orange-700 text-[11px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <FiShield className="w-3 h-3" /> System Admin
                          </span>
                        )}
                        {user?.role === 'hod' && (
                          <span className="mt-2.5 px-3 py-0.5 bg-indigo-100 text-indigo-700 text-[11px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <FiBriefcase className="w-3 h-3" /> HOD ({user?.department})
                          </span>
                        )}
                        {user?.role === 'user' && (
                          <span className="mt-2.5 px-3 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <FiUser className="w-3 h-3" /> Faculty ({user?.department})
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
                        className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 rounded-xl transition text-xs md:text-sm font-semibold"
                      >
                        <FiUser className="w-4 h-4 text-orange-500" />
                        <span>My Profile & Leave Info</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 rounded-xl transition text-xs md:text-sm font-semibold"
                      >
                        <FiSettings className="w-4 h-4 text-slate-500" />
                        <span>{t('settings')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs md:text-sm font-semibold"
                      >
                        <FiLogOut className="w-4 h-4" />
                        <span>{t('logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative border border-slate-100 fade-in">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative border border-slate-100 fade-in">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 fade-in">
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
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                  />
                </div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 text-center fade-in">
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
