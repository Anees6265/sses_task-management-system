import React, { useState, useEffect, useContext } from 'react';
import { userAPI, taskAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import FacultyAttendanceCalendar from './FacultyAttendanceCalendar.jsx';
import {
  FiArrowLeft,
  FiUser,
  FiMail,
  FiBriefcase,
  FiClock,
  FiCheckCircle,
  FiList,
  FiSearch,
  FiFilter,
  FiAlertTriangle,
  FiAward,
  FiTrendingUp,
  FiPhone,
  FiCalendar,
  FiRefreshCw,
  FiActivity,
  FiCheckSquare,
  FiTag,
  FiExternalLink
} from 'react-icons/fi';

const FacultyPerformanceOverview = ({
  faculty,
  targetUser,
  facultyId,
  leaves: passedLeaves,
  onRefresh,
  onBack,
  isStandalone = false
}) => {
  const { user: currentUser } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [facultyLeaves, setFacultyLeaves] = useState(passedLeaves || []);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    todoTasks: 0,
    inprogressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    onTimeCompletionRate: 0
  });
  const [tasks, setTasks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveFacultyId = faculty?._id || targetUser?._id || facultyId || (typeof faculty === 'string' ? faculty : null) || currentUser?._id;

  useEffect(() => {
    if (Array.isArray(passedLeaves) && passedLeaves.length > 0) {
      setFacultyLeaves(passedLeaves);
    }
  }, [passedLeaves]);

  useEffect(() => {
    fetchPerformanceData();
  }, [effectiveFacultyId]);

  const fetchPerformanceData = async () => {
    if (!effectiveFacultyId) return;
    setLoading(true);
    try {
      // 1. Try dedicated single faculty performance endpoint
      let perfData = null;
      try {
        const res = await userAPI.getFacultyPerformanceById(effectiveFacultyId);
        if (res?.data) {
          perfData = res.data;
        }
      } catch (err) {
        console.warn('Dedicated faculty performance endpoint failed, falling back:', err.message);
      }

      if (perfData) {
        setFacultyInfo(perfData.faculty || faculty || targetUser);
        setMetrics(perfData.metrics || {
          totalTasks: 0,
          pendingTasks: 0,
          todoTasks: 0,
          inprogressTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          onTimeCompletionRate: 0
        });
        setTasks(perfData.tasks || []);
        setRecentActivities(perfData.recentActivities || []);
      } else {
        // Fallback: fetch using getTasksByFaculty or getFacultyTaskHistory
        const [historyRes, userRes] = await Promise.allSettled([
          userAPI.getFacultyTaskHistory(effectiveFacultyId),
          userAPI.getUserById(effectiveFacultyId)
        ]);

        const fetchedUser = userRes.status === 'fulfilled' && userRes.value?.data ? userRes.value.data : (faculty || targetUser || currentUser);
        setFacultyInfo(fetchedUser);

        const allTasks = historyRes.status === 'fulfilled' && Array.isArray(historyRes.value?.data) ? historyRes.value.data : [];
        setTasks(allTasks);

        // Filter tasks assigned to this faculty
        const assignedTasks = allTasks.filter(t => {
          if (!t || !t.assignedTo) return false;
          if (Array.isArray(t.assignedTo)) {
            return t.assignedTo.some(u => String(u._id || u) === String(effectiveFacultyId));
          }
          return String(t.assignedTo._id || t.assignedTo) === String(effectiveFacultyId);
        });

        const now = new Date();
        const total = assignedTasks.length;
        const todo = assignedTasks.filter(t => t.status === 'todo').length;
        const inprogress = assignedTasks.filter(t => t.status === 'inprogress').length;
        const completed = assignedTasks.filter(t => t.status === 'completed').length;
        const overdue = assignedTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setMetrics({
          totalTasks: total,
          pendingTasks: todo,
          todoTasks: todo,
          inprogressTasks: inprogress,
          completedTasks: completed,
          overdueTasks: overdue,
          completionRate: rate,
          onTimeCompletionRate: completed > 0 ? 100 : 0
        });

        // Generate synthetic recent activities
        const activities = [];
        allTasks.slice(0, 15).forEach(t => {
          if (t.status === 'completed') {
            activities.push({
              _id: `comp-${t._id}`,
              action: 'TASK_COMPLETED',
              details: { title: t.title, taskId: t._id },
              performedBy: { name: fetchedUser.name },
              createdAt: t.completedAt || t.updatedAt || t.createdAt
            });
          }
          if (t.createdAt) {
            activities.push({
              _id: `asg-${t._id}`,
              action: 'TASK_ASSIGNED',
              details: { title: t.title, priority: t.priority, taskId: t._id },
              performedBy: t.createdBy ? { name: t.createdBy.name } : { name: 'Admin' },
              createdAt: t.createdAt
            });
          }
        });
        activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentActivities(activities);
      }
    } catch (error) {
      console.error('Error fetching faculty performance details:', error);
      toast.error('Failed to load faculty performance details');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchPerformanceData();
    setRefreshing(false);
    toast.success('Performance data updated');
  };

  const now = new Date();

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (!task) return false;

    // Status filter
    if (statusFilter === 'todo' && task.status !== 'todo') return false;
    if (statusFilter === 'inprogress' && task.status !== 'inprogress') return false;
    if (statusFilter === 'completed' && task.status !== 'completed') return false;
    if (statusFilter === 'overdue') {
      const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now;
      if (!isOverdue) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = (task.title || '').toLowerCase().includes(query);
      const descMatch = (task.description || '').toLowerCase().includes(query);
      if (!titleMatch && !descMatch) return false;
    }

    return true;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700 border border-orange-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700 border border-blue-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
  };

  const getStatusBadge = (task) => {
    const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now;
    if (task.status === 'completed') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
          <FiCheckCircle className="w-3 h-3 text-emerald-600" /> Completed
        </span>
      );
    }
    if (task.status === 'inprogress') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <FiTrendingUp className="w-3 h-3 text-amber-600" /> In Progress
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
        <FiClock className="w-3 h-3 text-indigo-600" /> Pending (To Do)
      </span>
    );
  };

  const formatActivityAction = (activity) => {
    switch (activity.action) {
      case 'TASK_COMPLETED':
        return {
          title: 'Completed Task',
          desc: `Marked "${activity.details?.title || 'task'}" as completed`,
          color: 'bg-emerald-500',
          icon: FiCheckCircle
        };
      case 'TASK_STATUS_CHANGED':
        return {
          title: 'Status Updated',
          desc: `Status changed to ${activity.details?.newStatus || 'new status'}`,
          color: 'bg-amber-500',
          icon: FiTrendingUp
        };
      case 'TASK_ASSIGNED':
      case 'TASK_CREATED':
        return {
          title: 'Task Assigned',
          desc: `Assigned task "${activity.details?.title || 'task'}"`,
          color: 'bg-indigo-500',
          icon: FiCheckSquare
        };
      case 'TASK_REASSIGNED':
        return {
          title: 'Task Reassigned',
          desc: 'Task assignment updated',
          color: 'bg-purple-500',
          icon: FiRefreshCw
        };
      case 'TASK_COMMENT_ADDED':
        return {
          title: 'Comment Added',
          desc: 'Added a discussion comment',
          color: 'bg-sky-500',
          icon: FiActivity
        };
      default:
        return {
          title: activity.action?.replace(/_/g, ' ') || 'Task Activity',
          desc: activity.details?.title || 'Task updated',
          color: 'bg-slate-500',
          icon: FiActivity
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-3"></div>
        <p className="text-slate-600 font-bold text-sm">Loading Faculty Performance...</p>
      </div>
    );
  }

  const effectiveName = facultyInfo?.name || 'Faculty Member';
  const effectiveEmail = facultyInfo?.email || '';
  const effectiveDept = facultyInfo?.department || 'General';
  const effectiveRole = facultyInfo?.role || 'Faculty';

  return (
    <div className="space-y-6 fade-in">
      {/* Standalone View Header with Breadcrumbs & Back Button */}
      {isStandalone && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-3xl text-white shadow-xl">
          <div className="space-y-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 transition backdrop-blur-md active:scale-95 w-fit"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30">
                  Performance Report
                </span>
                <span className="text-xs text-slate-400 font-bold">•</span>
                <span className="text-xs text-slate-300 font-bold capitalize">{effectiveDept} Department</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                <FiAward className="text-orange-400 w-7 h-7" />
                <span>{effectiveName} – Faculty Performance</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1">
                Detailed task breakdown, completion metrics, complete task history & recent activity timeline
              </p>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 transition backdrop-blur-md self-start md:self-auto"
            title="Refresh Performance"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      )}

      {/* 1. FACULTY PROFILE INFORMATION CARD */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black text-2xl md:text-3xl flex items-center justify-center shadow-lg shadow-orange-500/20 border-2 border-white flex-shrink-0">
            {facultyInfo?.profileImage ? (
              <img
                src={facultyInfo.profileImage}
                alt={effectiveName}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              effectiveName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl md:text-2xl font-black text-slate-900">{effectiveName}</h3>
              <span className="px-3 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-black rounded-full uppercase tracking-wider border border-orange-200">
                {effectiveRole === 'user' ? 'Faculty Member' : effectiveRole.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <FiMail className="w-3.5 h-3.5 text-slate-400" />
                {effectiveEmail}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-700 capitalize">
                <FiBriefcase className="w-3.5 h-3.5 text-orange-500" />
                {effectiveDept}
              </span>
              {facultyInfo?.phoneNumber && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                    {facultyInfo.phoneNumber}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Completion Gauge Highlight */}
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full md:w-auto justify-between md:justify-start">
          <div className="text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Completion Rate</span>
            <span className="text-2xl md:text-3xl font-black text-slate-900">{metrics.completionRate}%</span>
          </div>
          <div className="w-20 md:w-28 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.completionRate >= 75 ? 'bg-emerald-500' : metrics.completionRate >= 40 ? 'bg-amber-500' : 'bg-orange-500'
              }`}
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tasks Assigned */}
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
              <FiList className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-slate-900">{metrics.totalTasks}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Total Tasks Assigned</p>
        </div>

        {/* Pending Tasks (To Do) */}
        <div className="glass-card rounded-3xl p-5 border border-indigo-100 bg-indigo-50/30 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <FiClock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">To Do</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-indigo-700">{metrics.pendingTasks || metrics.todoTasks || 0}</p>
          <p className="text-xs font-bold text-indigo-950/70 mt-1">Pending (To Do)</p>
        </div>

        {/* In Progress Tasks */}
        <div className="glass-card rounded-3xl p-5 border border-amber-100 bg-amber-50/30 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
              <FiTrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-700">{metrics.inprogressTasks || 0}</p>
          <p className="text-xs font-bold text-amber-950/70 mt-1">In Progress Tasks</p>
        </div>

        {/* Completed Tasks */}
        <div className="glass-card rounded-3xl p-5 border border-emerald-100 bg-emerald-50/30 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Done</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-700">{metrics.completedTasks || 0}</p>
          <p className="text-xs font-bold text-emerald-950/70 mt-1">Completed Tasks</p>
        </div>

        {/* Overdue Tasks */}
        <div className="glass-card rounded-3xl p-5 border border-rose-100 bg-rose-50/30 shadow-sm hover:shadow-md transition col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Overdue</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-rose-700">{metrics.overdueTasks || 0}</p>
          <p className="text-xs font-bold text-rose-950/70 mt-1">Overdue Tasks</p>
        </div>
      </div>

      {/* 3. COMPLETE TASK HISTORY */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
              <FiCheckSquare className="text-orange-500 w-6 h-6" />
              <span>Complete Task History ({filteredTasks.length})</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              All tasks assigned to {effectiveName} across sprint boards and departments
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto text-xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'all' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'}`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setStatusFilter('todo')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'todo' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}
              >
                To Do
              </button>
              <button
                onClick={() => setStatusFilter('inprogress')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'inprogress' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'}`}
              >
                In Progress
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'completed' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'}`}
              >
                Completed
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'overdue' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'}`}
              >
                Overdue
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-52">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FiCheckSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Tasks Matching Criteria</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing the status filter or search query</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Task Details</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredTasks.map((task) => {
                  const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now;

                  return (
                    <tr key={task._id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 max-w-sm">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-800 leading-tight">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">{getPriorityBadge(task.priority)}</td>
                      <td className="p-3.5">{getStatusBadge(task)}</td>
                      <td className="p-3.5">
                        {task.dueDate ? (
                          <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                            <FiCalendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                            {isOverdue && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black">
                                LATE
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">No deadline</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500">
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800 capitalize">
                        {task.department || 'General'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. CALENDAR & LEAVE MANAGEMENT (RESTORED) */}
      <FacultyAttendanceCalendar
        faculty={facultyInfo || faculty || targetUser}
        leaves={facultyLeaves}
        onRefresh={() => {
          fetchPerformanceData();
          if (onRefresh) onRefresh();
        }}
      />

      {/* 5. RECENT TASK ACTIVITIES TIMELINE */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
              <FiActivity className="text-orange-500 w-6 h-6" />
              <span>Recent Task Activities & Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Chronological log of recent task updates, completions, assignments and status changes
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
            {recentActivities.length} Events
          </span>
        </div>

        <div className="overflow-hidden">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FiActivity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Recent Activity Recorded</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {recentActivities.map((activity, idx) => {
                const formatted = formatActivityAction(activity);
                const IconComponent = formatted.icon;

                return (
                  <div key={activity._id || idx} className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full ${formatted.color} text-white flex items-center justify-center text-[10px] shadow-sm`}>
                      <IconComponent className="w-3 h-3" />
                    </div>
                    <div className="bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200/70 transition w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{formatted.title}</span>
                          {activity.performedBy?.name && (
                            <span className="text-slate-500 font-normal">by {activity.performedBy.name}</span>
                          )}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Recently'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{formatted.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyPerformanceOverview;