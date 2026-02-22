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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
            <span className="text-4xl">📊</span>
            <span>Admin Dashboard</span>
          </h2>
          <p className="text-gray-600 mt-2">Complete overview of all departments and tasks</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl shadow-lg">
          <p className="text-sm font-medium opacity-90">Overall Progress</p>
          <p className="text-3xl font-bold">{overallProgress}%</p>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gray-100 p-3 rounded-xl">
              <span className="text-3xl">📊</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-4xl font-bold text-gray-800 mt-1">{stats?.totalTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-gray-800 h-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* To Do */}
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <span className="text-3xl">📋</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">To Do</p>
              <p className="text-4xl font-bold text-blue-600 mt-1">{stats?.todoTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${calculateProgress(stats?.todoTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-3 rounded-xl">
              <span className="text-3xl">🚀</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-4xl font-bold text-orange-600 mt-1">{stats?.inprogressTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-orange-600 h-full" style={{ width: `${calculateProgress(stats?.inprogressTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-xl">
              <span className="text-3xl">✅</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-4xl font-bold text-green-600 mt-1">{stats?.completedTasks || 0}</p>
            </div>
          </div>
          <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-green-600 h-full" style={{ width: `${calculateProgress(stats?.completedTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Department-wise Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <span className="text-3xl">🏛️</span>
            <span>Department Performance</span>
          </h3>
          <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
            {stats?.departmentStats?.length || 0} Departments Active
          </div>
        </div>

        {stats?.departmentStats && stats.departmentStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.departmentStats.map((dept) => {
              const deptProgress = calculateProgress(dept.completed, dept.total);
              
              return (
                <div key={dept._id} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-800">{dept._id}</h4>
                    <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                      {deptProgress}%
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>📊</span>
                        <span>Total</span>
                      </span>
                      <span className="font-bold text-gray-800 text-lg">{dept.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>📋</span>
                        <span>To Do</span>
                      </span>
                      <span className="font-semibold text-blue-600">{dept.todo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>🚀</span>
                        <span>In Progress</span>
                      </span>
                      <span className="font-semibold text-orange-600">{dept.inprogress}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>✅</span>
                        <span>Completed</span>
                      </span>
                      <span className="font-semibold text-green-600">{dept.completed}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
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
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-4">📁</p>
            <p className="text-lg">No department data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
