import React, { useState, useEffect, useContext } from 'react';
import { departmentAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import {
  FiPieChart,
  FiCheckSquare,
  FiMessageSquare,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiZap,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiBriefcase,
  FiUsers
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

  useEffect(() => {
    if (userRole === 'admin') {
      fetchDepartments();
    }
  }, [userRole, refreshTrigger]);

  const fetchDepartments = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const adminMenuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'board', icon: '📋', label: 'All Tasks' },
    { id: 'departments', icon: '🏛️', label: 'Department Management' },
    { id: 'all-hods', icon: '👨‍💼', label: 'All HODs' },
    { id: 'chats', icon: '💬', label: 'Chats' },
    ...(userRole === 'admin' ? departments.map(dept => {
      const deptName = typeof dept === 'object' ? (dept.name || '') : String(dept || '');
      return {
        id: deptName,
        icon: '📁',
        label: deptName
      };
    }) : [])
  ];

  const hodMenuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'board', icon: '📋', label: 'My Department' },
    { id: 'chats', icon: '💬', label: 'Chats' }
  ];

  const userMenuItems = [
    { id: 'board', icon: '📊', label: 'Kanban Board' },
    { id: 'chats', icon: '💬', label: 'Chats' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : (userRole === 'hod' ? hodMenuItems : userMenuItems);
  const isLeaveActive = activeView === 'leaves' || activeView === 'departments-overview' || activeView === 'dept-detail' || activeView === 'faculty-profile';

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
        } md:translate-x-0 ${isCollapsed ? 'w-16 md:w-20' : 'w-64'
        }`} style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))', height: 'calc(100vh - 60px - env(safe-area-inset-top, 0px))' }}>
        <div className="p-3 h-full flex flex-col justify-between">
          <div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full mb-4 p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-800 text-xs md:text-sm font-semibold flex items-center justify-center space-x-2 flex-shrink-0"
            >
              {isCollapsed ? <FiChevronRight className="w-5 h-5" /> : <FiChevronLeft className="w-5 h-5" />}
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>

            <nav className="space-y-1.5 flex-1 overflow-y-auto">
              {/* Main Navigation Items */}
              {(userRole === 'admin' || userRole === 'hod') && (
                <button
                  onClick={() => {
                    setActiveView('dashboard');
                    setIsMobileOpen(false);
                  }}
                  title={isCollapsed ? 'Institutional Dashboard' : undefined}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'dashboard'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <FiPieChart className={`w-5 h-5 ${activeView === 'dashboard' ? 'text-white' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">Executive Dashboard</span>}
                </button>
              )}

              {(userRole === 'admin' || userRole === 'hod') && (
                <button
                  onClick={() => {
                    setActiveView('users');
                    setIsMobileOpen(false);
                  }}
                  title={isCollapsed ? (userRole === 'admin' ? 'Faculty & Staff Directory' : 'Department Faculty') : undefined}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'users'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <FiUsers className={`w-5 h-5 ${activeView === 'users' ? 'text-white' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">{userRole === 'admin' ? 'Faculty & Staff Directory' : 'Department Faculty'}</span>}
                </button>
              )}

              <button
                onClick={() => {
                  setActiveView('board');
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? 'Task Management Board' : undefined}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'board'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <FiCheckSquare className={`w-5 h-5 ${activeView === 'board' ? 'text-white' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">{userRole === 'admin' ? 'Institutional Task Board' : userRole === 'hod' ? 'Department Task Board' : 'My Academic Tasks'}</span>}
              </button>

              {userRole === 'admin' && (
                <>
                  <button
                    onClick={() => {
                      setActiveView('departments');
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed ? 'Department Governance' : undefined}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'departments'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <FiBriefcase className={`w-5 h-5 ${activeView === 'departments' ? 'text-white' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">Department Governance</span>}
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('all-hods');
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed ? 'Heads of Department (HODs)' : undefined}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'all-hods'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <FiBriefcase className={`w-5 h-5 ${activeView === 'all-hods' ? 'text-white' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">Heads of Department (HODs)</span>}
                  </button>
                </>
              )}

              {/* LEAVE MANAGEMENT DROPDOWN WITH SUBMENUS */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsLeaveDropdownOpen(!isLeaveDropdownOpen)}
                  title={isCollapsed ? 'Leave & Absence Administration' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${isLeaveActive
                      ? 'bg-orange-50 text-orange-700 font-extrabold border border-orange-200/80'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiCalendar className={`w-5 h-5 ${isLeaveActive ? 'text-orange-600' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">Leave & Attendance</span>}
                  </div>
                  {!isCollapsed && (
                    <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isLeaveDropdownOpen ? 'rotate-180 text-orange-600' : 'text-slate-400'}`} />
                  )}
                </button>

                {/* Submenu Items */}
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
                      <span>Leave Applications & Approval</span>
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
                      <span>{userRole === 'user' ? 'My Department Overview' : 'Department Attendance Overview'}</span>
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
                      <span>My Profile & Leave Ledger</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Chat & Communications */}
              <button
                onClick={() => {
                  setActiveView('chats');
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? 'Communications' : undefined}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === 'chats'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <FiMessageSquare className={`w-5 h-5 ${activeView === 'chats' ? 'text-white' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">Department Communications</span>}
              </button>

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
                    title={isCollapsed ? deptName : undefined}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-bold text-xs md:text-sm ${activeView === deptName
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <FiBriefcase className={`w-5 h-5 ${activeView === deptName ? 'text-white' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">{deptName}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {!isCollapsed && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between px-2 text-[11px] text-slate-400 font-semibold flex-shrink-0">
              <span>SSES Academic Portal</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">● Active</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
