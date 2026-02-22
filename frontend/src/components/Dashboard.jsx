import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api.jsx';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await taskAPI.getDashboardStats();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const calculateProgress = (completed, total) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const overallProgress = calculateProgress(stats?.completedTasks, stats?.totalTasks);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-gray-800 flex items-center space-x-2">
            <span className="text-2xl md:text-4xl">📊</span>
            <span>Admin Dashboard</span>
          </h2>
          <p className="text-xs md:text-base text-gray-600 mt-1">Overview of all departments</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-lg">
          <p className="text-xs md:text-sm font-medium opacity-90">Overall Progress</p>
          <p className="text-2xl md:text-3xl font-bold">{overallProgress}%</p>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {/* Total Tasks */}
        <div className="bg-white rounded-xl p-3 md:p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
            <div className="bg-gray-100 p-2 md:p-3 rounded-xl mb-2 md:mb-0 w-fit">
              <span className="text-xl md:text-3xl">📊</span>
            </div>
            <div className="md:text-right">
              <p className="text-xs md:text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl md:text-4xl font-bold text-gray-800 mt-0.5 md:mt-1">{stats?.totalTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-1.5 md:h-2 rounded-full overflow-hidden">
            <div className="bg-gray-800 h-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* To Do */}
        <div className="bg-white rounded-xl p-3 md:p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
            <div className="bg-blue-50 p-2 md:p-3 rounded-xl mb-2 md:mb-0 w-fit">
              <span className="text-xl md:text-3xl">📋</span>
            </div>
            <div className="md:text-right">
              <p className="text-xs md:text-sm font-medium text-gray-500">To Do</p>
              <p className="text-2xl md:text-4xl font-bold text-blue-600 mt-0.5 md:mt-1">{stats?.todoTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-1.5 md:h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${calculateProgress(stats?.todoTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-xl p-3 md:p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
            <div className="bg-orange-50 p-2 md:p-3 rounded-xl mb-2 md:mb-0 w-fit">
              <span className="text-xl md:text-3xl">🚀</span>
            </div>
            <div className="md:text-right">
              <p className="text-xs md:text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl md:text-4xl font-bold text-orange-600 mt-0.5 md:mt-1">{stats?.inprogressTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-1.5 md:h-2 rounded-full overflow-hidden">
            <div className="bg-orange-600 h-full" style={{ width: `${calculateProgress(stats?.inprogressTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl p-3 md:p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
            <div className="bg-green-50 p-2 md:p-3 rounded-xl mb-2 md:mb-0 w-fit">
              <span className="text-xl md:text-3xl">✅</span>
            </div>
            <div className="md:text-right">
              <p className="text-xs md:text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl md:text-4xl font-bold text-green-600 mt-0.5 md:mt-1">{stats?.completedTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-1.5 md:h-2 rounded-full overflow-hidden">
            <div className="bg-green-600 h-full" style={{ width: `${calculateProgress(stats?.completedTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Department-wise Stats */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl border-2 border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-2">
          <h3 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <span className="text-2xl md:text-3xl">🏛️</span>
            <span>Department Performance</span>
          </h3>
          <div className="text-xs md:text-sm text-gray-500 bg-gray-100 px-3 md:px-4 py-1.5 md:py-2 rounded-lg w-fit">
            {stats?.departmentStats?.length || 0} Departments
          </div>
        </div>

        {stats?.departmentStats && stats.departmentStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {stats.departmentStats.map((dept) => {
              const deptProgress = calculateProgress(dept.completed, dept.total);
              
              return (
                <div key={dept._id} className="bg-white rounded-xl p-4 md:p-6 border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h4 className="text-base md:text-xl font-bold text-gray-800 truncate pr-2">{dept._id}</h4>
                    <div className="bg-gray-100 text-gray-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-bold flex-shrink-0">
                      {deptProgress}%
                    </div>
                  </div>

                  <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-600 flex items-center space-x-1">
                        <span>📊</span>
                        <span>Total</span>
                      </span>
                      <span className="font-bold text-gray-800 text-sm md:text-lg">{dept.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-600 flex items-center space-x-1">
                        <span>📋</span>
                        <span>To Do</span>
                      </span>
                      <span className="font-semibold text-blue-600 text-xs md:text-base">{dept.todo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-600 flex items-center space-x-1">
                        <span>🚀</span>
                        <span>Progress</span>
                      </span>
                      <span className="font-semibold text-orange-600 text-xs md:text-base">{dept.inprogress}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-600 flex items-center space-x-1">
                        <span>✅</span>
                        <span>Done</span>
                      </span>
                      <span className="font-semibold text-gray-700 text-xs md:text-base">{dept.completed}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-gray-200 h-2 md:h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-gray-800 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${deptProgress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 text-gray-400">
            <p className="text-3xl md:text-5xl mb-2 md:mb-4">📁</p>
            <p className="text-sm md:text-lg">No department data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
