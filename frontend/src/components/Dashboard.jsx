import React, { useState, useEffect, useContext, useMemo } from 'react';
import { taskAPI, leaveAPI, userAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { notifyDataRefresh } from '../utils/eventBus.js';
import FacultyProfileModal from './FacultyProfileModal.jsx';
import Loader from './Loader.jsx';
import { 
  FiPieChart, 
  FiCheckSquare, 
  FiClock, 
  FiTrendingUp, 
  FiUserCheck, 
  FiCalendar, 
  FiArrowRight, 
  FiUsers, 
  FiBriefcase, 
  FiCheckCircle, 
  FiAlertCircle,
  FiAlertTriangle,
  FiChevronRight,
  FiLayers,
  FiFilter,
  FiSun,
  FiSearch,
  FiExternalLink
} from 'react-icons/fi';

const Dashboard = ({ 
  setActiveView, 
  onFacultyClick, 
  onSelectDepartment, 
  onOpenFacultyProfile 
}) => {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  const [selectedFacultyProfile, setSelectedFacultyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tasks' | 'leaves'
  const [facultySearchQuery, setFacultySearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData(true);

    const handleRefresh = (e) => {
      fetchDashboardData(false);
    };

    window.addEventListener('app_data_refresh', handleRefresh);
    return () => window.removeEventListener('app_data_refresh', handleRefresh);
  }, []);

  const fetchDashboardData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [
        statsRes, 
        attendanceRes, 
        leavesRes, 
        tasksRes, 
        holidaysRes,
        usersRes
      ] = await Promise.allSettled([
        taskAPI.getDashboardStats(),
        leaveAPI.getDailyAttendance(),
        leaveAPI.getLeaves({ all: 'true' }),
        taskAPI.getTasks(),
        leaveAPI.getHolidays(),
        userAPI.getAllUsers()
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (attendanceRes.status === 'fulfilled') setAttendanceData(attendanceRes.value.data || []);
      if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value.data || []);
      if (tasksRes.status === 'fulfilled') {
        const rawTasks = tasksRes.value.data;
        setTasksList(Array.isArray(rawTasks) ? rawTasks : (rawTasks?.data || []));
      }
      if (holidaysRes.status === 'fulfilled') setHolidays(holidaysRes.value.data || []);
      if (usersRes.status === 'fulfilled') {
        const rawUsers = usersRes.value.data;
        setAllUsers(Array.isArray(rawUsers) ? rawUsers : (rawUsers?.users || []));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Helper Calculations
  const calculateProgress = (completed, total) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const totalTasks = tasksList.length > 0 ? tasksList.length : (stats?.totalTasks || 0);
  const completedTasks = tasksList.length > 0 ? tasksList.filter(t => t.status === 'completed').length : (stats?.completedTasks || 0);
  const inprogressTasks = tasksList.length > 0 ? tasksList.filter(t => t.status === 'inprogress').length : (stats?.inprogressTasks || 0);
  const todoTasks = tasksList.length > 0 ? tasksList.filter(t => t.status === 'todo').length : (stats?.todoTasks || 0);
  const overallTaskProgress = calculateProgress(completedTasks, totalTasks);

  // Daily Attendance Calculations
  const totalPresentCount = attendanceData.reduce((acc, d) => acc + (d.presentCount || 0), 0);
  const totalAbsentCount = attendanceData.reduce((acc, d) => acc + (d.absentCount || 0), 0);
  const totalFacultyCount = totalPresentCount + totalAbsentCount;
  const attendanceRate = totalFacultyCount > 0 ? Math.round((totalPresentCount / totalFacultyCount) * 100) : 100;

  // Leave Calculations
  const pendingLeaves = useMemo(() => {
    return leaves.filter(l => l.status === 'pending');
  }, [leaves]);

  const approvedLeaves = useMemo(() => {
    return leaves.filter(l => l.status === 'approved');
  }, [leaves]);

  // Aggregate who is on leave today
  const facultyOnLeaveToday = useMemo(() => {
    const list = [];
    const seenIds = new Set();

    attendanceData.forEach(dept => {
      const absents = dept.absentList || (dept.facultyList ? dept.facultyList.filter(f => !f.isPresentToday) : []);
      absents.forEach(f => {
        const id = f._id ? String(f._id) : f.email;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          list.push({
            ...f,
            department: f.department || dept.department
          });
        }
      });
    });

    return list;
  }, [attendanceData]);

  // Urgent & Overdue Tasks
  const { urgentTasks, overdueTasks } = useMemo(() => {
    const now = new Date();
    const overdue = [];
    const urgent = [];

    tasksList.forEach(t => {
      if (t.status === 'completed') return;
      const isOverdue = t.dueDate && new Date(t.dueDate) < now;
      if (isOverdue) {
        overdue.push(t);
      }
      if (t.priority === 'urgent' || t.priority === 'high' || isOverdue) {
        urgent.push(t);
      }
    });

    // Sort urgent tasks by due date ascending
    urgent.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    return { urgentTasks: urgent.slice(0, 5), overdueTasks: overdue };
  }, [tasksList]);

  // Upcoming Holidays
  const upcomingHolidays = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return holidays
      .filter(h => {
        if (!h.startDate) return false;
        return new Date(h.startDate) >= todayMidnight;
      })
      .slice(0, 3);
  }, [holidays]);

  // Department Lookup Map
  const attendanceMap = useMemo(() => {
    const map = new Map();
    attendanceData.forEach(d => {
      if (d.department) {
        map.set(d.department.toLowerCase().trim(), d);
      }
    });
    return map;
  }, [attendanceData]);

  // Dynamically resolve department stats from live tasksList
  const resolvedDepartmentStats = useMemo(() => {
    if (tasksList.length > 0) {
      const deptMap = new Map();
      tasksList.forEach(t => {
        const dept = (t.department || 'General').trim();
        if (!deptMap.has(dept)) {
          deptMap.set(dept, { _id: dept, total: 0, todo: 0, inprogress: 0, completed: 0 });
        }
        const item = deptMap.get(dept);
        item.total += 1;
        if (t.status === 'todo') item.todo += 1;
        if (t.status === 'inprogress') item.inprogress += 1;
        if (t.status === 'completed') item.completed += 1;
      });
      return Array.from(deptMap.values());
    }
    return stats?.departmentStats || [];
  }, [tasksList, stats]);

  // Faculty Workload & Attendance Combined List
  const combinedFacultyList = useMemo(() => {
    // Collect from allUsers (non-admin) or stats.facultyStats
    const sourceUsers = allUsers.filter(u => u.role !== 'admin');
    const fallbackUsers = sourceUsers.length > 0 ? sourceUsers : (stats?.facultyStats || []);

    // Build absent set for quick lookup
    const absentSet = new Set(facultyOnLeaveToday.map(f => String(f._id || '')));

    let list = fallbackUsers.map(fac => {
      const facId = String(fac._id || '');
      const facEmail = (fac.email || '').trim().toLowerCase();
      const isAbsent = absentSet.has(facId);
      const leaveInfo = facultyOnLeaveToday.find(f => String(f._id || '') === facId || (facEmail && f.email && f.email.trim().toLowerCase() === facEmail));

      // Find tasks assigned to this faculty strictly from live tasksList
      const userTasks = tasksList.filter(t => {
        if (!t.assignedTo) return false;
        if (Array.isArray(t.assignedTo)) {
          return t.assignedTo.some(u => {
            const uId = String(u._id || u || '');
            const uEmail = (u?.email || '').trim().toLowerCase();
            return (facId && uId === facId) || (facEmail && uEmail && uEmail === facEmail);
          });
        }
        const aId = String(t.assignedTo._id || t.assignedTo || '');
        const aEmail = (t.assignedTo?.email || '').trim().toLowerCase();
        return (facId && aId === facId) || (facEmail && aEmail && aEmail === facEmail);
      });

      const userCompleted = userTasks.filter(t => t.status === 'completed').length;
      const userTotal = userTasks.length;
      const userActive = userTasks.filter(t => t.status !== 'completed').length;

      return {
        ...fac,
        isPresent: !isAbsent,
        leaveInfo: leaveInfo?.activeLeaveToday || null,
        completedCount: userCompleted,
        totalCount: userTotal,
        activeCount: userActive,
        progress: calculateProgress(userCompleted, userTotal)
      };
    });

    if (facultySearchQuery.trim()) {
      const q = facultySearchQuery.toLowerCase();
      list = list.filter(f => 
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.department && f.department.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allUsers, stats, facultyOnLeaveToday, tasksList, facultySearchQuery]);

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleOpenProfile = (facultyObj) => {
    if (onOpenFacultyProfile) {
      onOpenFacultyProfile(facultyObj);
    } else {
      setSelectedFacultyProfile(facultyObj);
    }
  };

  if (loading) {
    return <Loader message="Loading Operations Dashboard..." inline />;
  }

  return (
    <div className="space-y-6 fade-in pb-16">
      {/* 1. HERO OPERATIONS BANNER */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        {/* Decorative ambient patterns */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{user?.role === 'admin' ? 'Institutional Operations' : `${user?.department} Operations`}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Welcome back, {user?.name || 'Administrator'}
            </h1>
            
            <p className="text-xs sm:text-sm text-orange-100 font-medium flex items-center gap-2">
              <span>{currentDateFormatted}</span>
              <span>•</span>
              <span>Dual Operations: Task Management & Leave Tracking</span>
            </p>

            {/* Quick Navigation Action Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveView && setActiveView('board')}
                className="px-3.5 py-1.5 rounded-xl bg-white text-orange-700 text-xs font-bold hover:bg-orange-50 transition shadow-sm flex items-center gap-1.5"
              >
                <FiCheckSquare className="w-3.5 h-3.5" />
                <span>Task Board</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView && setActiveView('leaves')}
                className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition backdrop-blur-sm border border-white/30 flex items-center gap-1.5"
              >
                <FiCalendar className="w-3.5 h-3.5" />
                <span>Leave Approvals {pendingLeaves.length > 0 && `(${pendingLeaves.length})`}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView && setActiveView('departments-overview')}
                className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition backdrop-blur-sm border border-white/30 flex items-center gap-1.5"
              >
                <FiUserCheck className="w-3.5 h-3.5" />
                <span>Attendance Pulse</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView && setActiveView('users')}
                className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition backdrop-blur-sm border border-white/30 flex items-center gap-1.5"
              >
                <FiUsers className="w-3.5 h-3.5" />
                <span>Faculty Directory</span>
              </button>
            </div>
          </div>

          {/* Dual Pulse Widgets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            {/* Task Completion Pulse */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 flex items-center justify-between gap-4 min-w-[200px]">
              <div>
                <span className="text-[10px] font-bold text-orange-100 uppercase tracking-wider block">
                  Task Completion
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black">{overallTaskProgress}%</span>
                  <span className="text-xs text-orange-100 font-semibold">Done</span>
                </div>
                <span className="text-[11px] text-orange-200">
                  {completedTasks} of {totalTasks} finished
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-white shadow-inner">
                <FiTrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Attendance Pulse */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 flex items-center justify-between gap-4 min-w-[200px]">
              <div>
                <span className="text-[10px] font-bold text-orange-100 uppercase tracking-wider block">
                  Faculty On Duty
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black">{totalPresentCount}</span>
                  <span className="text-xs text-orange-100 font-semibold">Active</span>
                </div>
                <span className="text-[11px] text-orange-200">
                  {totalAbsentCount > 0 ? `${totalAbsentCount} on leave today` : '100% On Duty'}
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-white shadow-inner">
                <FiUserCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PERSPECTIVE TOGGLE TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiLayers className="w-3.5 h-3.5" />
            <span>Complete Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiCheckSquare className="w-3.5 h-3.5" />
            <span>Task Operations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'leaves'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiCalendar className="w-3.5 h-3.5" />
            <span>Leave & Attendance</span>
            {pendingLeaves.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-black">
                {pendingLeaves.length}
              </span>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Showing real-time data across {stats?.departmentStats?.length || attendanceData.length || 0} departments
        </p>
      </div>

      {/* 3. DUAL-PILLAR KPI CARDS */}
      <div className="space-y-4">
        {/* PILLAR 1: TASK MANAGEMENT CARDS */}
        {(activeTab === 'all' || activeTab === 'tasks') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FiCheckSquare className="w-4 h-4 text-orange-500" />
                <span>Task Management Deliverables</span>
              </h2>
              {setActiveView && (
                <button
                  type="button"
                  onClick={() => setActiveView('board')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <span>Open Task Board</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Deliverables */}
              <div 
                onClick={() => setActiveView && setActiveView('board')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiCheckSquare className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-800">{totalTasks}</p>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-2">
                  <span className="text-emerald-600 font-bold">{completedTasks} Done</span>
                  <span className="text-amber-600 font-bold">{inprogressTasks} Active</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${overallTaskProgress}%` }}
                  />
                </div>
              </div>

              {/* Card 2: In Progress */}
              <div 
                onClick={() => setActiveView && setActiveView('board')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiClock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-600">{inprogressTasks}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-2">
                  Actively under execution
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress(inprogressTasks, totalTasks)}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Completed */}
              <div 
                onClick={() => setActiveView && setActiveView('board')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiCheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">{completedTasks}</p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-2">
                  {overallTaskProgress}% Success Rate
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${overallTaskProgress}%` }}
                  />
                </div>
              </div>

              {/* Card 4: To Do & Overdue Alert */}
              <div 
                onClick={() => setActiveView && setActiveView('board')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To Do Queue</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiBriefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl sm:text-3xl font-black text-indigo-600">{todoTasks}</p>
                  {overdueTasks.length > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                      <FiAlertTriangle className="w-3 h-3" />
                      {overdueTasks.length} Overdue
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-2">
                  Awaiting start or assignment
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress(todoTasks, totalTasks)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PILLAR 2: LEAVE & ATTENDANCE CARDS */}
        {(activeTab === 'all' || activeTab === 'leaves') && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-orange-500" />
                <span>Leave & Faculty Attendance Pulse</span>
              </h2>
              {setActiveView && (
                <button
                  type="button"
                  onClick={() => setActiveView('leaves')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <span>Review All Leaves</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Faculty Present */}
              <div 
                onClick={() => setActiveView && setActiveView('departments-overview')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Present</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiUserCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600">{totalPresentCount}</p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-2">
                  {attendanceRate}% On-Campus Today
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Faculty On Leave Today */}
              <div 
                onClick={() => setActiveView && setActiveView('departments-overview')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On Leave Today</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiSun className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-600">{totalAbsentCount}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-2">
                  {totalAbsentCount === 0 ? (
                    <span className="text-emerald-600 font-bold">100% Full Attendance</span>
                  ) : (
                    <span className="text-amber-700 font-bold">{totalAbsentCount} Faculty on approved leave</span>
                  )}
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalFacultyCount > 0 ? (totalAbsentCount / totalFacultyCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Pending Leave Applications */}
              <div 
                onClick={() => setActiveView && setActiveView('leaves')}
                className={`rounded-2xl p-4 sm:p-5 border shadow-xs hover:shadow-md transition cursor-pointer group ${
                  pendingLeaves.length > 0 
                    ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400' 
                    : 'bg-white border-slate-200/80 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
                  <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${
                    pendingLeaves.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-50 text-rose-600'
                  }`}>
                    <FiAlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-black ${pendingLeaves.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {pendingLeaves.length}
                </p>
                <p className="text-[11px] font-semibold mt-2">
                  {pendingLeaves.length > 0 ? (
                    <span className="text-amber-700 font-bold">Requires Action / Review</span>
                  ) : (
                    <span className="text-slate-400">All applications cleared</span>
                  )}
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${pendingLeaves.length > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                    style={{ width: pendingLeaves.length > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>

              {/* Card 4: Approved Leaves / Active Holidays */}
              <div 
                onClick={() => setActiveView && setActiveView('leaves')}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-sky-300 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Holidays</span>
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-sky-600">{upcomingHolidays.length}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-2 truncate">
                  {upcomingHolidays.length > 0 ? (
                    <span>Next: {upcomingHolidays[0].title}</span>
                  ) : (
                    <span>Regular Academic Schedule</span>
                  )}
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: upcomingHolidays.length > 0 ? '100%' : '20%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. DUAL-COLUMN HIGH-IMPACT OPERATIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= COLUMN A: TASK MANAGEMENT OPERATIONS ================= */}
        {(activeTab === 'all' || activeTab === 'tasks') && (
          <div className="space-y-6">
            
            {/* Urgent & High-Priority Deliverables */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <FiAlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      Urgent & Priority Tasks
                    </h3>
                    <p className="text-xs text-slate-500">
                      Items requiring immediate attention or nearing deadline
                    </p>
                  </div>
                </div>

                {setActiveView && (
                  <button
                    type="button"
                    onClick={() => setActiveView('board')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <span>View Board</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {urgentTasks.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">All Priority Tasks on Track</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    No urgent bottlenecks or overdue deliverables at this moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {urgentTasks.map(task => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);

                    return (
                      <div
                        key={task._id}
                        onClick={() => {
                          if (task.assignedTo && onFacultyClick) {
                            const firstAssignee = assignees[0];
                            if (firstAssignee?._id) onFacultyClick(firstAssignee._id);
                            else if (setActiveView) setActiveView('board');
                          } else if (setActiveView) {
                            setActiveView('board');
                          }
                        }}
                        className="p-3.5 rounded-2xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/20 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-orange-600 transition truncate">
                              {task.title}
                            </span>
                            
                            {task.priority === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700 uppercase">
                                Urgent
                              </span>
                            )}
                            {task.priority === 'high' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                                High
                              </span>
                            )}
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-600 text-white uppercase animate-pulse">
                                Overdue
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-600 capitalize">
                              Dept: {task.department || 'General'}
                            </span>
                            <span>•</span>
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                              Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                            </span>
                            {assignees.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-medium truncate max-w-[150px]">
                                  {assignees.map(a => a.name || 'Faculty').join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                            task.status === 'inprogress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.status === 'inprogress' ? 'In Progress' : 'To Do'}
                          </span>
                          <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Department Task Progress Breakdown */}
            {resolvedDepartmentStats && resolvedDepartmentStats.length > 0 && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                      <FiBriefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        Department Task Performance
                      </h3>
                      <p className="text-xs text-slate-500">
                        Completion rate per academic department
                      </p>
                    </div>
                  </div>

                  {setActiveView && (
                    <button
                      type="button"
                      onClick={() => setActiveView('departments-overview')}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <span>All Departments</span>
                      <FiArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {resolvedDepartmentStats.map(dept => {
                    const deptProgress = calculateProgress(dept.completed, dept.total);
                    const deptAttendance = attendanceMap.get(String(dept._id || '').toLowerCase().trim());
                    const present = deptAttendance?.presentCount || 0;
                    const leave = deptAttendance?.absentCount || 0;

                    return (
                      <div
                        key={dept._id}
                        onClick={() => onSelectDepartment && onSelectDepartment(dept._id)}
                        className="p-3.5 rounded-2xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/20 transition cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-orange-600 transition capitalize">
                              {dept._id}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              ({dept.completed}/{dept.total} tasks)
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {present} On Duty
                            </span>
                            <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                              {deptProgress}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${deptProgress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= COLUMN B: LEAVE & ATTENDANCE OPERATIONS ================= */}
        {(activeTab === 'all' || activeTab === 'leaves') && (
          <div className="space-y-6">
            
            {/* Actionable Pending Leave Applications */}
            <div className={`rounded-3xl p-5 sm:p-6 border shadow-xs space-y-4 ${
              pendingLeaves.length > 0 
                ? 'bg-gradient-to-b from-amber-50/50 via-white to-white border-amber-200' 
                : 'bg-white border-slate-200/80'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${pendingLeaves.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        Pending Leave Requests
                      </h3>
                      {pendingLeaves.length > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full animate-bounce">
                          {pendingLeaves.length} Action Needed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Faculty applications awaiting administrative decision
                    </p>
                  </div>
                </div>

                {setActiveView && (
                  <button
                    type="button"
                    onClick={() => setActiveView('leaves')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <span>Manage Leaves</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Zero Pending Requests</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    All faculty leave applications have been reviewed and processed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.slice(0, 4).map(leave => (
                    <div
                      key={leave._id}
                      onClick={() => setActiveView && setActiveView('leaves')}
                      className="p-3.5 bg-white rounded-2xl border border-amber-200/90 hover:border-amber-400 hover:shadow-sm transition cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                            {leave.applicant?.name?.charAt(0).toUpperCase() || 'F'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-amber-700 transition">
                              {leave.applicant?.name || 'Faculty Member'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              Dept: {leave.department || leave.applicant?.department || 'General'}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-md uppercase">
                          {leave.leaveType || 'Leave'}
                        </span>
                      </div>

                      {leave.reason && (
                        <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2 rounded-xl border border-amber-100 line-clamp-2">
                          "{leave.reason}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
                        <span>
                          {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                        <span className="font-bold text-amber-700">
                          {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {pendingLeaves.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setActiveView && setActiveView('leaves')}
                      className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition text-center"
                    >
                      View all {pendingLeaves.length} pending applications →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Who is on Leave Today? (Attendance Pulse) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <FiUserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      Who is on Leave Today?
                    </h3>
                    <p className="text-xs text-slate-500">
                      Faculty members currently away on approved leave
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500">
                  {facultyOnLeaveToday.length} absent today
                </span>
              </div>

              {facultyOnLeaveToday.length === 0 ? (
                <div className="py-6 text-center space-y-1.5 bg-emerald-50/40 rounded-2xl border border-emerald-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <FiUserCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-800">100% Full Attendance Today!</p>
                  <p className="text-[11px] text-emerald-600">Every faculty member is on campus and on duty.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {facultyOnLeaveToday.map(fac => {
                    const leave = fac.activeLeaveToday;

                    return (
                      <div
                        key={fac._id || fac.email}
                        onClick={() => handleOpenProfile(fac)}
                        className="p-3 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/70 hover:border-orange-300 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                            {fac.name?.charAt(0).toUpperCase() || 'F'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs sm:text-sm truncate group-hover:text-orange-600 transition">
                              {fac.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate capitalize">
                              {fac.department} • {leave?.leaveType || 'On Approved Leave'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            On Leave
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Official Holidays */}
            {upcomingHolidays.length > 0 && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-800">Upcoming Holidays</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Institutional Calendar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {upcomingHolidays.map(holiday => (
                    <div 
                      key={holiday._id}
                      className="p-3 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-1"
                    >
                      <p className="font-bold text-sky-900 text-xs truncate">{holiday.title}</p>
                      <p className="text-[11px] text-sky-700 font-semibold">
                        {new Date(holiday.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {holiday.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1">{holiday.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* 5. FACULTY WORKLOAD & AVAILABILITY MATRIX */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiUsers className="w-5 h-5 text-orange-500" />
              <span>Faculty Workload & Availability Pulse</span>
            </h2>
            <p className="text-xs text-slate-500">
              Live duty status, task completion percentage, and active assignments per faculty member
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={facultySearchQuery}
                onChange={(e) => setFacultySearchQuery(e.target.value)}
                placeholder="Search faculty or dept..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>

            {setActiveView && (
              <button
                type="button"
                onClick={() => setActiveView('users')}
                className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
              >
                <span>Directory</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {combinedFacultyList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No faculty members found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {combinedFacultyList.slice(0, 9).map(faculty => {
              return (
                <div
                  key={faculty._id}
                  onClick={() => handleOpenProfile(faculty)}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/70 hover:border-orange-400 hover:shadow-md transition cursor-pointer bg-slate-50/30 hover:bg-white flex flex-col justify-between group space-y-3"
                >
                  <div>
                    {/* Header: Avatar, Name, and Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                          {faculty.name?.charAt(0).toUpperCase() || 'F'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition text-sm truncate capitalize">
                            {faculty.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {faculty.department || 'Faculty'}
                          </p>
                        </div>
                      </div>

                      {/* Presence Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 flex-shrink-0 ${
                        faculty.isPresent 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${faculty.isPresent ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {faculty.isPresent ? 'Present' : 'On Leave'}
                      </span>
                    </div>

                    {/* Task Progress Bar */}
                    <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Tasks Completed</span>
                        <span>{faculty.completedCount} / {faculty.totalCount} ({faculty.progress}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${faculty.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Card Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span className="text-orange-600 hover:underline font-bold">
                      View Profile & Leaves
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFacultyClick) {
                          onFacultyClick(faculty._id);
                        } else if (setActiveView) {
                          setActiveView('board');
                        }
                      }}
                      className="text-slate-400 group-hover:text-orange-600 flex items-center gap-1 font-semibold"
                    >
                      <span>Tasks</span>
                      <FiChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {combinedFacultyList.length > 9 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setActiveView && setActiveView('users')}
              className="px-4 py-2 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <span>View all {combinedFacultyList.length} faculty in Directory</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Faculty Profile Modal (Fallback if opened directly) */}
      {selectedFacultyProfile && (
        <FacultyProfileModal
          faculty={selectedFacultyProfile}
          targetUser={selectedFacultyProfile}
          facultyId={selectedFacultyProfile._id}
          onClose={() => setSelectedFacultyProfile(null)}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default Dashboard;
