import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../services/api';

const Sidebar = ({ activeView, setActiveView, userRole }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchDepartments();
    }
  }, [userRole]);

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
    ...departments.map(dept => ({
      id: dept,
      icon: '🏛️',
      label: dept
    }))
  ];

  const userMenuItems = [
    { id: 'board', icon: '📊', label: 'Kanban Board' },
    { id: 'tasks', icon: '✅', label: 'All Tasks' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems;

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 hidden md:block fixed left-0 top-[73px] h-[calc(100vh-73px)] z-40 ${
      isCollapsed ? 'w-16 md:w-20' : 'w-48 md:w-64'
    }`}>
      <div className="p-2 md:p-4 h-full flex flex-col">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full mb-4 md:mb-6 p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 text-sm md:text-base flex-shrink-0"
        >
          {isCollapsed ? '→' : '←'}
        </button>

        <nav className="space-y-1 md:space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center space-x-2 md:space-x-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition text-sm md:text-base ${
                activeView === item.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg md:text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {!isCollapsed && userRole !== 'admin' && (
          <div className="mt-6 md:mt-8 p-3 md:p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 flex-shrink-0">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm md:text-base">💡 Quick Tip</h3>
            <p className="text-xs text-gray-600">
              Drag and drop tasks between columns to update their status instantly!
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
