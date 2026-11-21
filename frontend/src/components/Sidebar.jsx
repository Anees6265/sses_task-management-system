import React, { useState, useEffect, useContext } from 'react';
import { departmentAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import {
  FiPieChart,
  FiCheckSquare,
  FiMessageSquare,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiBriefcase,
  FiUsers,
  FiX
} from 'react-icons/fi';

const Sidebar = ({
  activeView,
  setActiveView,
  userRole,
  isMobileOpen,
  setIsMobileOpen,
  refreshTrigger,
  isCollapsed: controlledIsCollapsed,
  setIsCollapsed: controlledSetIsCollapsed,
  onOpenProfile,
  selectedFacultyForProfile
}) => {
  const { user: currentUser } = useContext(AuthContext);
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = (value) => {
    if (controlledSetIsCollapsed) {
      if (typeof value === 'function') {
        controlledSetIsCollapsed(value(isCollapsed));
      } else {
        controlledSetIsCollapsed(value);
      }
    } else {
      setInternalIsCollapsed(value);
    }
  };
  const [departments, setDepartments] = useState([]);
  const [isLeaveDropdownOpen, setIsLeaveDropdownOpen] = useState(true);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchDepartments();
    }

    const handleRefresh = (e) => {
      const type = e?.detail?.type;
      if (!type || type === 'all' || type === 'departments') {
        if (userRole === 'admin') {
          fetchDepartments();
        }
      }
    };
    window.addEventListener('app_data_refresh', handleRefresh);
    return () => window.removeEventListener('app_data_refresh', handleRefresh);
  }, [userRole, refreshTrigger]);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const isLeaveActive = activeView === 'leaves' || activeView === 'departments-overview' || activeView === 'dept-detail' || activeView === 'faculty-profile';

  const isTaskActive = activeView === 'board' || (userRole === 'admin' && departments.some(dept => {
    const deptName = typeof dept === 'object' ? (dept.name || '') : String(dept || '');
    return deptName && activeView === deptName;
  }));

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`bg-white/95 border-r border-slate-200/80 transition-all duration-300 fixed left-0 z-50 md:z-40 shadow-sm ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${isCollapsed ? 'w-64 md:w-20' : 'w-64'
        }`} style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))', height: 'calc(100vh - 60px - env(safe-area-inset-top, 0px))' }}>
        <div className="p-3 h-full flex flex-col justify-between">
          <div>
            {/* Desktop Collapse / Expand Header */}
            <div className={`hidden md:flex items-center mb-3 pb-2 border-b border-slate-100 ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
              {!isCollapsed && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex items-center justify-center cursor-pointer"
              >
                {isCollapsed ? <FiChevronRight className="w-5 h-5 text-slate-600" /> : <FiChevronLeft className="w-5 h-5" />}
              </button>
            </div>

            {/* Mobile Header (Close Drawer) */}
            <div className="flex md:hidden items-center justify-between mb-3 pb-2 border-b border-slate-100 px-2">
              <span className="text-xs font-bold text-slate-700">Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1.5 flex-1 overflow-y-auto">
              {/* Dashboard */}
              {(userRole === 'admin' || userRole === 'hod') && (
                <button
                  onClick={() => {
                    setActiveView('dashboard');
                    setIsMobileOpen(false);
                  }}
                  title={isCollapsed ? 'Dashboard' : undefined}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'dashboard'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <FiPieChart className={`w-5 h-5 ${activeView === 'dashboard' ? 'text-white' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">Dashboard</span>}
                </button>
              )}

              {/* Faculty Directory (Includes all Faculty & HODs) */}
              {(userRole === 'admin' || userRole === 'hod') && (
                <button
                  onClick={() => {
                    setActiveView('users');
                    setIsMobileOpen(false);
                  }}
                  title={isCollapsed ? (userRole === 'admin' ? 'Faculty Directory' : 'Department Faculty') : undefined}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'users'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <FiUsers className={`w-5 h-5 ${activeView === 'users' ? 'text-white' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">{userRole === 'admin' ? 'Faculty Directory' : 'Department Faculty'}</span>}
                </button>
              )}

              {/* LEAVE MANAGEMENT DROPDOWN */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      setActiveView('leaves');
                    } else {
                      setIsLeaveDropdownOpen(!isLeaveDropdownOpen);
                    }
                  }}
                  title={isCollapsed ? 'Leaves' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${isLeaveActive
                      ? 'bg-orange-50 text-orange-700 font-extrabold border border-orange-200/80'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiCalendar className={`w-5 h-5 ${isLeaveActive ? 'text-orange-600' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">Leaves</span>}
                  </div>
                  {!isCollapsed && (
                    <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isLeaveDropdownOpen ? 'rotate-180 text-orange-600' : 'text-slate-400'}`} />
                  )}
                </button>

                {/* Leave Submenu Items */}
                {isLeaveDropdownOpen && !isCollapsed && (
                  <div className="pl-6 space-y-1 border-l-2 border-orange-200 ml-5 my-1">
                    <button
                      onClick={() => {
                        setActiveView('leaves');
                        setIsMobileOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeView === 'leaves'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>Leave Applications</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('departments-overview');
                        setIsMobileOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeView === 'departments-overview' || activeView === 'dept-detail'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{userRole === 'user' ? 'Department Overview' : 'Attendance Overview'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenProfile) {
                          onOpenProfile();
                        } else {
                          setActiveView('faculty-profile');
                        }
                        setIsMobileOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${(activeView === 'faculty-profile' && (!selectedFacultyForProfile || String(selectedFacultyForProfile?._id || '') === String(currentUser?._id || '')))
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>My Profile & Leaves</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TASKS DROPDOWN */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      setActiveView('board');
                    } else {
                      setIsTaskDropdownOpen(!isTaskDropdownOpen);
                    }
                  }}
                  title={isCollapsed ? 'Tasks' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${isTaskActive
                      ? 'bg-orange-50 text-orange-700 font-extrabold border border-orange-200/80'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiCheckSquare className={`w-5 h-5 ${isTaskActive ? 'text-orange-600' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">Tasks</span>}
                  </div>
                  {!isCollapsed && (
                    <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTaskDropdownOpen ? 'rotate-180 text-orange-600' : 'text-slate-400'}`} />
                  )}
                </button>

                {/* Tasks Submenu Items */}
                {isTaskDropdownOpen && !isCollapsed && (
                  <div className="pl-6 space-y-1 border-l-2 border-orange-200 ml-5 my-1">
                    <button
                      onClick={() => {
                        setActiveView('board');
                        setIsMobileOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeView === 'board'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{userRole === 'admin' ? 'All Tasks' : userRole === 'hod' ? 'Department Tasks' : 'My Tasks'}</span>
                    </button>

                    {/* Department Task Boards */}
                    {userRole === 'admin' && departments.map(dept => {
                      const deptName = typeof dept === 'object' ? (dept.name || '') : String(dept || '');
                      if (!deptName) return null;
                      return (
                        <button
                          key={deptName}
                          onClick={() => {
                            setActiveView(deptName);
                            setIsMobileOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${activeView === deptName
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span className="truncate">{deptName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Department Management (Admin Only) */}
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setActiveView('departments');
                    setIsMobileOpen(false);
                  }}
                  title={isCollapsed ? 'Departments' : undefined}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'departments'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <FiBriefcase className={`w-5 h-5 ${activeView === 'departments' ? 'text-white' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">Departments</span>}
                </button>
              )}

              {/* Chats */}
              <button
                onClick={() => {
                  setActiveView('chats');
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? 'Chats' : undefined}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'chats'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <FiMessageSquare className={`w-5 h-5 ${activeView === 'chats' ? 'text-white' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">Chats</span>}
              </button>
            </nav>
          </div>

          {!isCollapsed && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between px-2 text-[11px] text-slate-400 font-semibold flex-shrink-0">
              <span>SSES Portal</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">● Active</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
