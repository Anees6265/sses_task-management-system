import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../services/api.jsx';
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
  FiBriefcase
} from 'react-icons/fi';

const Sidebar = ({ activeView, setActiveView, userRole, isMobileOpen, setIsMobileOpen, refreshTrigger }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  const isLeaveActive = activeView === 'leaves' || activeView === 'departments-overview' || activeView === 'dept-detail';

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
      <aside className={`bg-white/95 border-r border-slate-200/80 transition-all duration-300 fixed left-0 z-50 md:z-40 shadow-sm ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 ${
        isCollapsed ? 'w-16 md:w-20' : 'w-64'
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
                title={isCollapsed ? 'Dashboard' : undefined}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-semibold text-xs md:text-sm ${
                  activeView === 'dashboard'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FiPieChart className={`w-5 h-5 ${activeView === 'dashboard' ? 'text-white' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">Dashboard</span>}
              </button>
            )}

            <button
              onClick={() => {
                setActiveView('board');
                setIsMobileOpen(false);
              }}
              title={isCollapsed ? 'Tasks' : undefined}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-semibold text-xs md:text-sm ${
                activeView === 'board'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FiCheckSquare className={`w-5 h-5 ${activeView === 'board' ? 'text-white' : 'text-slate-500'}`} />
              {!isCollapsed && <span className="truncate">{userRole === 'hod' ? 'My Department Tasks' : userRole === 'user' ? 'Kanban Board' : 'All Tasks'}</span>}
            </button>

            {/* LEAVE MANAGEMENT DROPDOWN WITH SUBMENUS */}
            <div className="space-y-1">
              <button
                onClick={() => setIsLeaveDropdownOpen(!isLeaveDropdownOpen)}
                title={isCollapsed ? 'Leave Management' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition font-semibold text-xs md:text-sm ${
                  isLeaveActive
                    ? 'bg-orange-50 text-orange-700 font-extrabold border border-orange-200/80'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FiCalendar className={`w-5 h-5 ${isLeaveActive ? 'text-orange-600' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate">Leave Management</span>}
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      activeView === 'leaves'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>Leave Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('departments-overview');
                      setIsMobileOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      activeView === 'departments-overview' || activeView === 'dept-detail'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>Department Dashboard</span>
                  </button>
                </div>
              )}
            </div>

            {/* Chat & Extra Items */}
            <button
              onClick={() => {
                setActiveView('chats');
                setIsMobileOpen(false);
              }}
              title={isCollapsed ? 'Chats' : undefined}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-semibold text-xs md:text-sm ${
                activeView === 'chats'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FiMessageSquare className={`w-5 h-5 ${activeView === 'chats' ? 'text-white' : 'text-slate-500'}`} />
              {!isCollapsed && <span className="truncate">Chats</span>}
            </button>

            {userRole === 'admin' && departments.map(dept => (
              <button
                key={dept}
                onClick={() => {
                  setActiveView(dept);
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? dept : undefined}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition font-semibold text-xs md:text-sm ${
                  activeView === dept
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FiBriefcase className={`w-5 h-5 ${activeView === dept ? 'text-white' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="truncate">{dept}</span>}
              </button>
            ))}
          </nav>
        </div>

        {!isCollapsed && userRole !== 'admin' && userRole !== 'hod' && (
          <div className="mt-4 p-4 bg-gradient-to-br from-orange-50/80 to-amber-50/80 rounded-2xl border border-orange-200/60 flex-shrink-0">
            <div className="flex items-center gap-2 text-orange-700 font-bold text-xs mb-1.5 uppercase tracking-wider">
              <FiZap className="w-4 h-4 text-orange-500" />
              <span>Quick Tip</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Check leave dashboard & department dashboard under Leave Management!
            </p>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
