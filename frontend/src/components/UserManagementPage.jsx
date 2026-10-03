import React, { useState, useEffect, useContext, useMemo } from 'react';
import { userAPI, departmentAPI, taskAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import Modal from './Modal.jsx';
import { 
  FiUsers, 
  FiSearch, 
  FiFilter, 
  FiEdit3, 
  FiBriefcase, 
  FiCheckCircle, 
  FiX, 
  FiUserCheck, 
  FiShield, 
  FiMail,
  FiChevronRight,
  FiPhone,
  FiBarChart2,
  FiTrendingUp,
  FiClock,
  FiAlertTriangle
} from 'react-icons/fi';

const UserManagementPage = ({ onOpenFacultyProfile }) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'workload' | 'performance'
  const [users, setUsers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [departments, setDepartments] = useState(['Computer Science', 'Information Technology', 'Management', 'Electronics & Comm.']);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Modal for changing department (Admin only)
  const [selectedUserForDeptChange, setSelectedUserForDeptChange] = useState(null);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, tasksRes, workloadRes, perfRes] = await Promise.allSettled([
        userAPI.getAllUsers(),
        departmentAPI.getAllDepartments(),
        taskAPI.getTasks(),
        userAPI.getFacultyWorkload(),
        userAPI.getFacultyPerformance()
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value?.data) {
        setUsers(usersRes.value.data);
      }
      if (deptsRes.status === 'fulfilled' && deptsRes.value?.data?.length > 0) {
        setDepartments(Array.from(new Set([...departments, ...deptsRes.value.data])));
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value?.data) {
        setAllTasks(tasksRes.value.data);
      }
      if (workloadRes.status === 'fulfilled' && workloadRes.value?.data) {
        setWorkloadData(workloadRes.value.data);
      }
      if (perfRes.status === 'fulfilled' && perfRes.value?.data) {
        setPerformanceData(perfRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to load user directory data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangeDeptModal = (targetUser) => {
    setSelectedUserForDeptChange(targetUser);
    setTargetDepartment(targetUser.department || departments[0] || 'Computer Science');
    setIsCustomDept(false);
    setCustomDeptName('');
  };

  const handleSaveDepartmentChange = async (e) => {
    e.preventDefault();
    if (!selectedUserForDeptChange) return;

    const finalDept = isCustomDept ? customDeptName.trim() : targetDepartment;
    if (!finalDept) {
      toast.error('Please specify a valid department');
      return;
    }

    setUpdating(true);
    try {
      await userAPI.updateUserDepartment(selectedUserForDeptChange._id, finalDept);
      toast.success(`Department updated to "${finalDept}" for ${selectedUserForDeptChange.name}`);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u._id === selectedUserForDeptChange._id ? { ...u, department: finalDept } : u
      ));

      // Also update departments list if custom
      if (isCustomDept && !departments.includes(finalDept)) {
        setDepartments(prev => [...prev, finalDept]);
      }

      setSelectedUserForDeptChange(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department');
    } finally {
      setUpdating(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isHOD = user?.role === 'hod';

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.phoneNumber && u.phoneNumber.includes(searchQuery));
      const matchesDept = deptFilter === 'all' || u.department === deptFilter;
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      if (isHOD) {
        const isSameDept = u.department === user?.department;
        return matchesSearch && matchesRole && isSameDept;
      }

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [users, searchQuery, deptFilter, roleFilter, isHOD, user]);

  // Combined Workload List
  const combinedWorkloadList = useMemo(() => {
    let sourceList = [];
    if (workloadData && workloadData.length > 0) {
      sourceList = workloadData;
    } else {
      const now = new Date();
      sourceList = users.map(u => {
        const uTasks = allTasks.filter(t => {
          if (!t.assignedTo) return false;
          if (Array.isArray(t.assignedTo)) {
            return t.assignedTo.some(a => String(a._id || a) === String(u._id));
          }
          return String(t.assignedTo._id || t.assignedTo) === String(u._id);
        });

        return {
          faculty: u,
          workload: {
            totalTasks: uTasks.length,
            todoTasks: uTasks.filter(t => t.status === 'todo').length,
            inprogressTasks: uTasks.filter(t => t.status === 'inprogress').length,
            completedTasks: uTasks.filter(t => t.status === 'completed').length,
            overdueTasks: uTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length
          }
        };
      });
    }

    return sourceList.filter(item => {
      const f = item.faculty || {};
      const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            f.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'all' || f.department === deptFilter;
      if (isHOD) {
        return matchesSearch && f.department === user?.department;
      }
      return matchesSearch && matchesDept;
    });
  }, [workloadData, users, allTasks, searchQuery, deptFilter, isHOD, user]);

  // Combined Performance List
  const combinedPerformanceList = useMemo(() => {
    let sourceList = [];
    if (performanceData && performanceData.length > 0) {
      sourceList = performanceData;
    } else {
      const now = new Date();
      sourceList = users.map(u => {
        const uTasks = allTasks.filter(t => {
          if (!t.assignedTo) return false;
          if (Array.isArray(t.assignedTo)) {
            return t.assignedTo.some(a => String(a._id || a) === String(u._id));
          }
          return String(t.assignedTo._id || t.assignedTo) === String(u._id);
        });

        const total = uTasks.length;
        const completed = uTasks.filter(t => t.status === 'completed').length;
        const overdue = uTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const onTime = uTasks.filter(t => t.status === 'completed' && (!t.dueDate || new Date(t.updatedAt || t.createdAt) <= new Date(t.dueDate))).length;
        const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

        const completedTaskList = uTasks.filter(t => t.status === 'completed');
        let totalHours = 0;
        completedTaskList.forEach(t => {
          const startTime = new Date(t.createdAt).getTime();
          const endTime = new Date(t.completedAt || t.updatedAt || Date.now()).getTime();
          const diff = Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
          totalHours += diff;
        });
        const avgHrs = completedTaskList.length > 0 ? Math.round((totalHours / completedTaskList.length) * 10) / 10 : 0;

        return {
          faculty: u,
          metrics: {
            totalTasks: total,
            completedTasks: completed,
            onTimeCompletionRate: onTimeRate,
            overdueTasks: overdue,
            avgCompletionTimeHours: avgHrs
          }
        };
      });
    }

    return sourceList.filter(item => {
      const f = item.faculty || {};
      const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            f.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'all' || f.department === deptFilter;
      if (isHOD) {
        return matchesSearch && f.department === user?.department;
      }
      return matchesSearch && matchesDept;
    });
  }, [performanceData, users, allTasks, searchQuery, deptFilter, isHOD, user]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-purple-300"><FiShield className="w-3 h-3" /> Admin</span>;
      case 'hod':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-amber-300"><FiUserCheck className="w-3 h-3" /> HOD</span>;
      default:
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-blue-300">Faculty</span>;
    }
  };

  const formatAvgCompletionTime = (hours) => {
    if (!hours || hours === 0) return 'N/A';
    if (hours >= 24) {
      const days = (hours / 24).toFixed(1);
      return `${days} ${days === '1.0' ? 'day' : 'days'}`;
    }
    return `${hours} hrs`;
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiUsers className="w-3.5 h-3.5" />
              {isAdmin ? 'Admin Control Center' : isHOD ? `${user?.department} Department Directory` : 'User Directory'}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>User & Faculty Directory</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300">
            {isAdmin 
              ? 'View all institution faculties & staff across departments. Reassign departments with full admin privileges.' 
              : `View faculties and colleagues in ${user?.department} department.`}
          </p>
        </div>
      </div>

      {/* Directory Stats Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <FiUsers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{filteredUsers.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Listed Users</p>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Faculty</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {filteredUsers.filter(u => u.role === 'user').length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Faculty Members</p>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <FiUserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Leadership</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">
            {filteredUsers.filter(u => u.role === 'hod' || u.role === 'admin').length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">HODs & Admins</p>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">Depts</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-purple-600">
            {new Set(users.map(u => u.department)).size}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Departments</p>
        </div>
      </div>

      {/* Tab Switcher & Search Bar (Placed directly under stats / above user records) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        {/* Left Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-2 border-orange-500 text-orange-600 bg-orange-50/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FiUsers className="w-4 h-4 text-orange-500" />
            <span>Faculty Directory ({filteredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workload')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'workload'
                ? 'border-2 border-orange-500 text-orange-600 bg-orange-50/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FiBarChart2 className="w-4 h-4 text-orange-500" />
            <span>Faculty Workload</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-2 border-orange-500 text-orange-600 bg-orange-50/60 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FiTrendingUp className="w-4 h-4 text-orange-500" />
            <span>Faculty Performance</span>
          </button>
        </div>

        {/* Right Controls: Search Input & Department Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 bg-white cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: FACULTY DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
          {/* Filter Sub-header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <FiUsers className="text-orange-500 w-5 h-5" />
                <span>User Records Directory</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Click any faculty row to view complete leave history & profile details
              </p>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="user">Faculty Only</option>
              <option value="hod">HOD Only</option>
              {isAdmin && <option value="admin">Admin Only</option>}
            </select>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <FiUsers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Users Found</p>
                  <p className="text-xs text-slate-400 mt-1">There are no user records matching the selected search query or filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                      <th className="p-3.5 rounded-l-2xl">User / Faculty</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Contact Number</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5 text-right rounded-r-2xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50/80 transition">
                        <td 
                          className="p-3.5 cursor-pointer group"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                          title="Click to view full faculty profile"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black flex items-center justify-center text-xs shadow-sm group-hover:scale-105 transition">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition">
                                {u.name}
                              </p>
                              <p className="text-[11px] text-slate-400">ID: {u._id ? String(u._id).slice(-6) : 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <FiMail className="w-3.5 h-3.5 text-slate-400" />
                            {u.email}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs font-semibold">
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <FiPhone className="w-3.5 h-3.5 text-emerald-600" />
                            {u.phoneNumber || 'Not provided'}
                          </span>
                        </td>
                        <td className="p-3.5">{getRoleBadge(u.role)}</td>
                        <td className="p-3.5">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 inline-flex items-center gap-1.5">
                            <FiBriefcase className="w-3 h-3 text-slate-400" />
                            {u.department || 'General'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenChangeDeptModal(u)}
                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-xs"
                                title="Change Department"
                              >
                                <FiEdit3 className="w-3.5 h-3.5" />
                                <span>Change Dept</span>
                              </button>
                            )}

                            <button
                              onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                              title="View Faculty Profile"
                            >
                              <FiChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      {/* TAB 2: FACULTY WORKLOAD (Image 1 Exact Match) */}
      {activeTab === 'workload' && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
          <div className="overflow-x-auto">
            {combinedWorkloadList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FiBarChart2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Workload Data Found</p>
                <p className="text-xs text-slate-400 mt-1">There are no faculty records matching the selected department or search filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                    <th className="p-3.5 rounded-l-2xl">Faculty Member</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Total Tasks</th>
                    <th className="p-3.5">Pending (To Do)</th>
                    <th className="p-3.5">In Progress</th>
                    <th className="p-3.5">Completed</th>
                    <th className="p-3.5 rounded-r-2xl">Overdue Tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                  {combinedWorkloadList.map((item, idx) => {
                    const faculty = item.faculty || {};
                    const wl = item.workload || {};
                    return (
                      <tr key={faculty._id || idx} className="hover:bg-slate-50/80 transition">
                        <td 
                          className="p-3.5 font-bold text-slate-800 hover:text-orange-600 cursor-pointer"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(faculty)}
                          title="Click to view faculty profile"
                        >
                          {faculty.name || 'Unknown Faculty'}
                        </td>
                        <td className="p-3.5 text-slate-500 font-medium">
                          {faculty.department || 'General'}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-900">
                          {wl.totalTasks ?? 0}
                        </td>
                        <td className="p-3.5 font-extrabold text-indigo-600">
                          {wl.todoTasks ?? 0}
                        </td>
                        <td className="p-3.5 font-extrabold text-amber-600">
                          {wl.inprogressTasks ?? 0}
                        </td>
                        <td className="p-3.5 font-extrabold text-emerald-600">
                          {wl.completedTasks ?? 0}
                        </td>
                        <td className="p-3.5 font-extrabold text-rose-600">
                          {wl.overdueTasks ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY PERFORMANCE (Image 2 Exact Match) */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
          <div className="overflow-x-auto">
            {combinedPerformanceList.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FiTrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Performance Data Found</p>
                <p className="text-xs text-slate-400 mt-1">There are no faculty performance records matching the selected search filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                    <th className="p-3.5 rounded-l-2xl">Faculty Member</th>
                    <th className="p-3.5">Tasks Assigned</th>
                    <th className="p-3.5">Tasks Completed</th>
                    <th className="p-3.5">On-Time Completion</th>
                    <th className="p-3.5">Overdue Tasks</th>
                    <th className="p-3.5 rounded-r-2xl">Avg Completion Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                  {combinedPerformanceList.map((item, idx) => {
                    const faculty = item.faculty || {};
                    const metrics = item.metrics || {};
                    const onTimeRate = metrics.onTimeCompletionRate ?? 0;

                    return (
                      <tr key={faculty._id || idx} className="hover:bg-slate-50/80 transition">
                        <td 
                          className="p-3.5 font-bold text-slate-800 hover:text-orange-600 cursor-pointer"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(faculty)}
                          title="Click to view faculty profile"
                        >
                          {faculty.name || 'Unknown Faculty'}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-900">
                          {metrics.totalTasks ?? 0}
                        </td>
                        <td className="p-3.5 font-extrabold text-emerald-600">
                          {metrics.completedTasks ?? 0}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold inline-block">
                            {onTimeRate}%
                          </span>
                        </td>
                        <td className="p-3.5 font-extrabold text-rose-600">
                          {metrics.overdueTasks ?? 0}
                        </td>
                        <td className="p-3.5 font-bold text-slate-500">
                          {formatAvgCompletionTime(metrics.avgCompletionTimeHours)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Change Department Modal (Admin Only) */}
      <Modal isOpen={!!selectedUserForDeptChange} onClose={() => setSelectedUserForDeptChange(null)}>
        {selectedUserForDeptChange && (
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiBriefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Change Faculty Department</h3>
                  <p className="text-xs text-slate-500 font-semibold">Reassign user to a new department</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForDeptChange(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartmentChange} className="space-y-5">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Target Faculty</p>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedUserForDeptChange.name}</p>
                <p className="text-xs text-slate-500">{selectedUserForDeptChange.email}</p>
                <p className="text-xs font-bold text-orange-600 mt-1">Current Department: {selectedUserForDeptChange.department || 'General'}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select New Department *
                </label>
                
                {!isCustomDept ? (
                  <div className="space-y-3">
                    <select
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCustomDept(true)}
                      className="text-xs text-orange-600 font-extrabold hover:underline block"
                    >
                      + Add New Custom Department
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter new department name (e.g. Electrical Eng.)"
                      value={customDeptName}
                      onChange={(e) => setCustomDeptName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomDept(false)}
                      className="text-xs text-slate-500 font-bold hover:underline block"
                    >
                      ← Select from existing departments list
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-sm disabled:opacity-50"
                >
                  {updating ? 'Saving Changes...' : 'Save Department Change'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForDeptChange(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementPage;
