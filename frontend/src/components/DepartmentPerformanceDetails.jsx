import React, { useState, useEffect, useContext } from 'react';
import { departmentAPI, taskAPI, userAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiBriefcase,
  FiUsers,
  FiList,
  FiClock,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiChevronRight,
  FiUser,
  FiAward
} from 'react-icons/fi';

const DepartmentPerformanceDetails = ({
  departmentName,
  onBack,
  onOpenFacultyPerformance,
  onOpenFacultyProfile
}) => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deptInfo, setDeptInfo] = useState(null);
  const [taskOverview, setTaskOverview] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inprogressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });
  const [facultyList, setFacultyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'tasks' | 'completion'

  const activeDeptName = (user?.role === 'hod' && user?.department)
    ? user.department
    : (departmentName || user?.department || 'General');

  useEffect(() => {
    fetchDepartmentPerformance();
  }, [departmentName, user]);

  const fetchDepartmentPerformance = async () => {
    setLoading(true);
    try {
      // 1. Try backend dedicated department performance endpoint
      let perfData = null;
      try {
        const res = await departmentAPI.getDepartmentPerformance(activeDeptName);
        if (res?.data) {
          perfData = res.data;
        }
      } catch (err) {
        console.warn('Dedicated department performance API failed, attempting fallback:', err.message);
      }

      if (perfData) {
        setDeptInfo(perfData.department || { name: activeDeptName });
        setTaskOverview(perfData.taskOverview || {
          totalTasks: 0,
          pendingTasks: 0,
          inprogressTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          completionRate: 0
        });
        setFacultyList(perfData.faculty || []);
      } else {
        // Fallback aggregation using taskAPI.getTasks and userAPI.getAllUsers
        const [tasksRes, usersRes] = await Promise.allSettled([
          taskAPI.getTasks(),
          userAPI.getAllUsers()
        ]);

        const allTasks = tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value?.data)
          ? tasksRes.value.data
          : [];
        const allUsers = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value?.data)
          ? usersRes.value.data
          : [];

        // Filter tasks for this department (excluding personal tasks)
        const deptTasks = allTasks.filter(t => 
          t.department && t.department.toLowerCase() === activeDeptName.toLowerCase() && !t.isPersonal
        );

        const now = new Date();
        const total = deptTasks.length;
        const todo = deptTasks.filter(t => t.status === 'todo').length;
        const inprogress = deptTasks.filter(t => t.status === 'inprogress').length;
        const completed = deptTasks.filter(t => t.status === 'completed').length;
        const overdue = deptTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setTaskOverview({
          totalTasks: total,
          pendingTasks: todo,
          inprogressTasks: inprogress,
          completedTasks: completed,
          overdueTasks: overdue,
          completionRate: rate
        });

        // Filter faculty members for this department
        const deptFaculty = allUsers.filter(u => 
          u.role === 'user' && u.department && u.department.toLowerCase() === activeDeptName.toLowerCase()
        );

        const facultyMetrics = deptFaculty.map(fac => {
          const facTasks = deptTasks.filter(t => {
            if (!t.assignedTo) return false;
            if (Array.isArray(t.assignedTo)) {
              return t.assignedTo.some(u => String(u._id || u) === String(fac._id));
            }
            return String(t.assignedTo._id || t.assignedTo) === String(fac._id);
          });

          const facTotal = facTasks.length;
          const facTodo = facTasks.filter(t => t.status === 'todo').length;
          const facInProgress = facTasks.filter(t => t.status === 'inprogress').length;
          const facCompleted = facTasks.filter(t => t.status === 'completed').length;
          const facOverdue = facTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
          const facRate = facTotal > 0 ? Math.round((facCompleted / facTotal) * 100) : 0;

          return {
            _id: fac._id,
            name: fac.name,
            email: fac.email,
            role: fac.role,
            department: fac.department,
            phoneNumber: fac.phoneNumber || '',
            status: fac.status || 'active',
            profileImage: fac.profileImage || null,
            totalTasks: facTotal,
            pendingTasks: facTodo,
            inprogressTasks: facInProgress,
            completedTasks: facCompleted,
            overdueTasks: facOverdue,
            completionRate: facRate
          };
        });

        setFacultyList(facultyMetrics);
        setDeptInfo({ name: activeDeptName });
      }
    } catch (error) {
      console.error('Error fetching department performance:', error);
      toast.error('Failed to load department performance details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDepartmentPerformance();
    setRefreshing(false);
    toast.success('Performance data updated');
  };

  // Filter & sort faculty members
  const filteredFaculty = facultyList.filter(fac => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = (fac.name || '').toLowerCase().includes(query);
    const emailMatch = (fac.email || '').toLowerCase().includes(query);
    return nameMatch || emailMatch;
  }).sort((a, b) => {
    if (sortBy === 'tasks') return b.totalTasks - a.totalTasks;
    if (sortBy === 'completion') return b.completionRate - a.completionRate;
    return (a.name || '').localeCompare(b.name || '');
  });

  const handleFacultyCardClick = (facultyMember) => {
    if (onOpenFacultyPerformance) {
      onOpenFacultyPerformance(facultyMember);
    } else if (onOpenFacultyProfile) {
      onOpenFacultyProfile(facultyMember);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-3"></div>
        <p className="text-slate-600 font-bold text-sm">Loading Department Performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* 1. Header Banner & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBack}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 transition backdrop-blur-md active:scale-95"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs text-orange-400 font-bold">Department Performance</span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs text-slate-200 font-black capitalize">{activeDeptName}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-black rounded-full uppercase tracking-wider border border-orange-500/30">
                Department Performance Details
              </span>
              {deptInfo?.code && (
                <span className="px-2.5 py-0.5 bg-white/10 text-slate-200 text-xs font-extrabold rounded-md uppercase border border-white/10">
                  {deptInfo.code}
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-4xl font-black tracking-tight mt-1 flex items-center gap-3">
              <FiBriefcase className="text-orange-400 w-8 h-8" />
              <span className="capitalize">{activeDeptName} Department</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Live department task distribution, faculty workload & individual performance tracking
            </p>
          </div>
        </div>

        {/* Quick Stats Pill & Refresh */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
            <p className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">Department Faculty</p>
            <p className="text-2xl font-black text-white">{facultyList.length} Members</p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition backdrop-blur-md active:scale-95"
            title="Refresh Performance Data"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. SECTION A: DEPARTMENT TASK OVERVIEW SUMMARY CARDS */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
              <FiList className="text-orange-500 w-6 h-6" />
              <span>Department Task Overview</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Aggregated task status counts for {activeDeptName} Department
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500">Overall Completion:</span>
            <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-xl shadow-xs border border-slate-200/60">
              {taskOverview.completionRate}%
            </span>
          </div>
        </div>

        {/* 4 Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Total Tasks */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                <FiList className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">All Tasks</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-slate-900">{taskOverview.totalTasks}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">Total Tasks</p>
          </div>

          {/* Pending Tasks (To Do) */}
          <div className="glass-card rounded-2xl p-5 border border-indigo-100 bg-indigo-50/40 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                <FiClock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">To Do</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-indigo-700">{taskOverview.pendingTasks}</p>
            <p className="text-xs font-bold text-indigo-950/70 mt-1">Pending Tasks</p>
          </div>

          {/* In Progress Tasks */}
          <div className="glass-card rounded-2xl p-5 border border-amber-100 bg-amber-50/40 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                <FiTrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Active</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-amber-700">{taskOverview.inprogressTasks}</p>
            <p className="text-xs font-bold text-amber-950/70 mt-1">In Progress Tasks</p>
          </div>

          {/* Completed Tasks */}
          <div className="glass-card rounded-2xl p-5 border border-emerald-100 bg-emerald-50/40 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Done</span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-emerald-700">{taskOverview.completedTasks}</p>
            <p className="text-xs font-bold text-emerald-950/70 mt-1">Completed Tasks</p>
          </div>
        </div>

        {/* Department Progress Bar */}
        <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${taskOverview.completionRate}%` }}
          />
        </div>
      </div>

      {/* 3. SECTION B: COMPLETE FACULTY LIST & PERFORMANCE TABLE */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
              <FiUsers className="text-orange-500 w-6 h-6" />
              <span>Department Faculty Performance ({filteredFaculty.length})</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Complete faculty roster for {activeDeptName} with task completion rates. Click any faculty member to view detailed history.
            </p>
          </div>

          {/* Controls: Search & Sort */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search faculty name / email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold w-full sm:w-auto">
              <FiFilter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-extrabold focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="tasks">Sort by Tasks Assigned</option>
                <option value="completion">Sort by Completion %</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View (Desktop & Tablet) */}
        <div className="overflow-x-auto">
          {filteredFaculty.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FiUsers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Faculty Members Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? 'No faculty matches your search' : `No faculty members currently registered in ${activeDeptName}`}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Faculty Member</th>
                  <th className="p-3.5 text-center">Total Assigned</th>
                  <th className="p-3.5 text-center">Pending Tasks</th>
                  <th className="p-3.5 text-center">In Progress</th>
                  <th className="p-3.5 text-center">Completed</th>
                  <th className="p-3.5 text-center">Completion %</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredFaculty.map((fac) => (
                  <tr
                    key={fac._id}
                    onClick={() => handleFacultyCardClick(fac)}
                    className="hover:bg-orange-50/40 transition cursor-pointer group"
                    title={`Click to view detailed performance for ${fac.name}`}
                  >
                    {/* Faculty Profile */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition flex-shrink-0">
                          {fac.profileImage ? (
                            <img
                              src={fac.profileImage}
                              alt={fac.name}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            fac.name?.charAt(0).toUpperCase() || 'F'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                            {fac.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{fac.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Total Assigned */}
                    <td className="p-3.5 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-black rounded-xl">
                        {fac.totalTasks}
                      </span>
                    </td>

                    {/* Pending Tasks (To Do) */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl border border-indigo-100">
                        {fac.pendingTasks}
                      </span>
                    </td>

                    {/* In Progress */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-black rounded-xl border border-amber-100">
                        {fac.inprogressTasks}
                      </span>
                    </td>

                    {/* Completed */}
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-xl border border-emerald-100">
                        {fac.completedTasks}
                      </span>
                    </td>

                    {/* Completion % with mini progress bar */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex flex-col items-center gap-1 min-w-[70px]">
                        <span className={`text-xs font-black ${
                          fac.completionRate >= 75 ? 'text-emerald-600' :
                          fac.completionRate >= 40 ? 'text-amber-600' : 'text-slate-600'
                        }`}>
                          {fac.completionRate}%
                        </span>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              fac.completionRate >= 75 ? 'bg-emerald-500' :
                              fac.completionRate >= 40 ? 'bg-amber-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${fac.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-black text-orange-600 group-hover:text-orange-700 group-hover:translate-x-0.5 transition-all">
                        <span>Details</span>
                        <FiChevronRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentPerformanceDetails;