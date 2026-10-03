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
  FiTrendingUp
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
  
  // Custom Department Modal
  const [selectedUserForDeptChange, setSelectedUserForDeptChange] = useState(null);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Edit User Details Modal
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'user',
    department: '',
    status: 'active'
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState(null);
  const [changingDeptId, setChangingDeptId] = useState(null);

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

  const isAdmin = user?.role === 'admin';
  const isHOD = user?.role === 'hod';

  const canEditUser = (targetUser) => {
    if (isAdmin) return true;
    if (isHOD && targetUser.role === 'user') return true;
    return false;
  };

  const canToggleStatus = (targetUser) => {
    if (isAdmin) return true;
    if (isHOD && targetUser.role === 'user') return true;
    return false;
  };

  const canChangeDepartment = (targetUser) => {
    if (isAdmin) return true;
    if (isHOD && targetUser.role === 'user') return true;
    return false;
  };

  // Toggle active / inactive status
  const handleToggleUserStatus = async (targetUser) => {
    if (!canToggleStatus(targetUser)) {
      toast.error('Access denied. HOD can only manage status for faculty members.');
      return;
    }

    const currentStatus = targetUser.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setTogglingStatusId(targetUser._id);
    try {
      await userAPI.toggleUserStatus(targetUser._id, newStatus);
      toast.success(`User "${targetUser.name}" status set to ${newStatus.toUpperCase()}`);
      setUsers(prev => prev.map(u => 
        u._id === targetUser._id ? { ...u, status: newStatus } : u
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Inline department change right inside table
  const handleInlineDepartmentChange = async (targetUser, newDept) => {
    if (newDept === '__CUSTOM__') {
      handleOpenChangeDeptModal(targetUser);
      return;
    }
    if (!newDept || newDept === targetUser.department) return;

    if (!canChangeDepartment(targetUser)) {
      toast.error('Access denied. HOD can only change department for faculty members.');
      return;
    }

    setChangingDeptId(targetUser._id);
    try {
      await userAPI.updateUserDepartment(targetUser._id, newDept);
      toast.success(`Department updated to "${newDept}" for ${targetUser.name}`);
      setUsers(prev => prev.map(u => 
        u._id === targetUser._id ? { ...u, department: newDept } : u
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department');
    } finally {
      setChangingDeptId(null);
    }
  };

  // Open Edit User Details Modal
  const handleOpenEditModal = (targetUser) => {
    setSelectedUserForEdit(targetUser);
    setEditFormData({
      name: targetUser.name || '',
      email: targetUser.email || '',
      phoneNumber: targetUser.phoneNumber || '',
      role: targetUser.role || 'user',
      department: targetUser.department || departments[0] || 'Computer Science',
      status: targetUser.status || 'active'
    });
  };

  // Save Edit User Details
  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setSavingEdit(true);
    try {
      const res = await userAPI.updateUser(selectedUserForEdit._id, editFormData);
      toast.success(`User details updated for "${editFormData.name}"`);
      
      setUsers(prev => prev.map(u => 
        u._id === selectedUserForEdit._id ? { ...u, ...res.data } : u
      ));

      if (editFormData.department && !departments.includes(editFormData.department)) {
        setDepartments(prev => [...prev, editFormData.department]);
      }

      setSelectedUserForEdit(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user details');
    } finally {
      setSavingEdit(false);
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
      
      setUsers(prev => prev.map(u => 
        u._id === selectedUserForDeptChange._id ? { ...u, department: finalDept } : u
      ));

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
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-extrabold rounded-md border border-purple-200 inline-flex items-center gap-1"><FiShield className="w-3 h-3" /> Admin</span>;
      case 'hod':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-md border border-amber-200 inline-flex items-center gap-1"><FiUserCheck className="w-3 h-3" /> HOD</span>;
      default:
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-md border border-blue-200 inline-flex items-center">Faculty</span>;
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
    <div className="space-y-5 fade-in pb-10">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-5 md:p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiUsers className="w-3.5 h-3.5" />
              {isAdmin ? 'Admin Control Center' : isHOD ? `${user?.department} Department Management` : 'User Directory'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-3">
            <span>User & Faculty Directory</span>
          </h2>
          <p className="text-xs text-slate-300">
            {isAdmin 
              ? 'View and manage all users. Edit details, toggle status (Activate/Deactivate), and change departments directly.' 
              : `Manage faculty in ${user?.department} department. Edit details, toggle status, and update department.`}
          </p>
        </div>
      </div>

      {/* Directory Stats Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-card glass-card-hover rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <FiUsers className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-slate-900">{filteredUsers.length}</p>
          <p className="text-xs font-semibold text-slate-500">Listed Users</p>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FiBriefcase className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Faculty</span>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-blue-600">
            {filteredUsers.filter(u => u.role === 'user').length}
          </p>
          <p className="text-xs font-semibold text-slate-500">Faculty Members</p>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FiCheckCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-emerald-600">
            {filteredUsers.filter(u => (u.status || 'active') === 'active').length}
          </p>
          <p className="text-xs font-semibold text-slate-500">Active Accounts</p>
        </div>

        <div className="glass-card glass-card-hover rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <FiX className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Inactive</span>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-rose-600">
            {filteredUsers.filter(u => u.status === 'inactive').length}
          </p>
          <p className="text-xs font-semibold text-slate-500">Deactivated</p>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Left Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-2 border-orange-500 text-orange-600 bg-orange-50/60 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FiUsers className="w-4 h-4 text-orange-500" />
            <span>Faculty Directory ({filteredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workload')}
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'workload'
                ? 'border-2 border-orange-500 text-orange-600 bg-orange-50/60 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FiBarChart2 className="w-4 h-4 text-orange-500" />
            <span>Faculty Workload</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-2 border-orange-500 text-orange-600 bg-orange-50/60 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FiTrendingUp className="w-4 h-4 text-orange-500" />
            <span>Faculty Performance</span>
          </button>
        </div>

        {/* Right Controls: Search Input & Department Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 bg-white cursor-pointer"
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
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
          {/* Filter Sub-header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <FiUsers className="text-orange-500 w-4 h-4" />
                <span>User Records Directory</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Compact action controls for active/deactivate status & department updates
              </p>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="user">Faculty Only</option>
              <option value="hod">HOD Only</option>
              {isAdmin && <option value="admin">Admin Only</option>}
            </select>
          </div>

          {/* Directory Table (Compact, Auto-fitted without horizontal scrollbar) */}
          <div className="overflow-x-auto scrollbar-none">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FiUsers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Users Found</p>
                <p className="text-xs text-slate-400 mt-0.5">There are no user records matching your filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/70">
                    <th className="py-2.5 px-3 rounded-l-xl">User / Faculty</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Toggle Action</th>
                    <th className="py-2.5 px-3 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredUsers.map((u) => {
                    const isUserActive = (u.status || 'active') === 'active';
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/80 transition">
                        {/* User / Faculty */}
                        <td className="py-2.5 px-3">
                          <div 
                            className="flex items-center gap-2.5 cursor-pointer group"
                            onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                            title="Click to view full profile"
                          >
                            <div className={`w-8 h-8 rounded-full ${isUserActive ? 'bg-gradient-to-tr from-orange-500 to-amber-400' : 'bg-slate-400'} text-white font-black flex items-center justify-center text-xs shadow-2xs group-hover:scale-105 transition shrink-0`}>
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition truncate max-w-[140px]" title={u.name}>
                                {u.name}
                              </p>
                              <p className="text-[10px] text-slate-400">ID: {u._id ? String(u._id).slice(-6) : 'N/A'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-2.5 px-3 text-slate-600 font-semibold">
                          <span className="flex items-center gap-1 max-w-[170px] truncate" title={u.email}>
                            <FiMail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-2.5 px-3 font-semibold">
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            <FiPhone className="w-3 h-3 text-slate-400" />
                            {u.phoneNumber || 'N/A'}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="py-2.5 px-3">{getRoleBadge(u.role)}</td>

                        {/* Department (Compact Inline Dropdown) */}
                        <td className="py-2.5 px-3">
                          {canChangeDepartment(u) ? (
                            <select
                              value={u.department || 'General'}
                              disabled={changingDeptId === u._id}
                              onChange={(e) => handleInlineDepartmentChange(u, e.target.value)}
                              className="px-2 py-1 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 focus:ring-1 focus:ring-orange-400 cursor-pointer transition disabled:opacity-50 max-w-[140px] truncate"
                              title="Change Department"
                            >
                              {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                              {isAdmin && <option value="__CUSTOM__">+ Custom Dept...</option>}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-md border border-slate-200 inline-flex items-center gap-1">
                              <FiBriefcase className="w-3 h-3 text-slate-400" />
                              {u.department || 'General'}
                            </span>
                          )}
                        </td>

                        {/* Status Indicator Badge */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold inline-flex items-center gap-1 ${
                            isUserActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isUserActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isUserActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Toggle Action (Small Activate / Deactivate Button) */}
                        <td className="py-2.5 px-3 text-center">
                          {canToggleStatus(u) ? (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={togglingStatusId === u._id}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer active:scale-95 border shadow-2xs ${
                                isUserActive
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                              title={isUserActive ? 'Click to Deactivate user account' : 'Click to Activate user account'}
                            >
                              {togglingStatusId === u._id ? (
                                <span className="animate-pulse">Saving...</span>
                              ) : isUserActive ? (
                                <span>Deactivate</span>
                              ) : (
                                <span>Activate</span>
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">—</span>
                          )}
                        </td>

                        {/* Actions (Edit & Profile View) */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEditUser(u) && (
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs"
                                title="Edit User Details"
                              >
                                <FiEdit3 className="w-3 h-3 text-orange-500" />
                                <span>Edit</span>
                              </button>
                            )}

                            <button
                              onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition"
                              title="View Profile"
                            >
                              <FiChevronRight className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* TAB 2: FACULTY WORKLOAD */}
      {activeTab === 'workload' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
          <div className="overflow-x-auto scrollbar-none">
            {combinedWorkloadList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FiBarChart2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Workload Data Found</p>
                <p className="text-xs text-slate-400 mt-0.5">There are no faculty records matching the filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/70">
                    <th className="py-2.5 px-3 rounded-l-xl">Faculty Member</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Total Tasks</th>
                    <th className="py-2.5 px-3">Pending (To Do)</th>
                    <th className="py-2.5 px-3">In Progress</th>
                    <th className="py-2.5 px-3">Completed</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Overdue Tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {combinedWorkloadList.map((item, idx) => {
                    const faculty = item.faculty || {};
                    const wl = item.workload || {};
                    return (
                      <tr key={faculty._id || idx} className="hover:bg-slate-50/80 transition">
                        <td 
                          className="py-2.5 px-3 font-bold text-slate-800 hover:text-orange-600 cursor-pointer"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(faculty)}
                          title="Click to view faculty profile"
                        >
                          {faculty.name || 'Unknown Faculty'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">
                          {faculty.department || 'General'}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {wl.totalTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-indigo-600">
                          {wl.todoTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-amber-600">
                          {wl.inprogressTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-600">
                          {wl.completedTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-rose-600">
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

      {/* TAB 3: FACULTY PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 space-y-4">
          <div className="overflow-x-auto scrollbar-none">
            {combinedPerformanceList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FiTrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Performance Data Found</p>
                <p className="text-xs text-slate-400 mt-0.5">There are no faculty performance records matching the filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/70">
                    <th className="py-2.5 px-3 rounded-l-xl">Faculty Member</th>
                    <th className="py-2.5 px-3">Tasks Assigned</th>
                    <th className="py-2.5 px-3">Tasks Completed</th>
                    <th className="py-2.5 px-3">On-Time Completion</th>
                    <th className="py-2.5 px-3">Overdue Tasks</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Avg Completion Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {combinedPerformanceList.map((item, idx) => {
                    const faculty = item.faculty || {};
                    const metrics = item.metrics || {};
                    const onTimeRate = metrics.onTimeCompletionRate ?? 0;

<<<<<<< HEAD
                    return (
                      <tr key={faculty._id || idx} className="hover:bg-slate-50/80 transition">
                        <td 
                          className="py-2.5 px-3 font-bold text-slate-800 hover:text-orange-600 cursor-pointer"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(faculty)}
                          title="Click to view faculty profile"
                        >
                          {faculty.name || 'Unknown Faculty'}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">
                          {metrics.totalTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-emerald-600">
                          {metrics.completedTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold inline-block">
                            {onTimeRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-rose-600">
                          {metrics.overdueTasks ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-500">
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

      {/* Edit User Details Modal (HOD & Admin) */}
      <Modal isOpen={!!selectedUserForEdit} onClose={() => setSelectedUserForEdit(null)}>
        {selectedUserForEdit && (
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 fade-in">
=======
      {/* EDIT FACULTY MODAL (HOD & Admin) */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in">
>>>>>>> dev_shivalika_02
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiEdit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Edit User Details</h3>
                  <p className="text-xs text-slate-500 font-semibold">Update user information, department & status</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-semibold text-slate-800"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address (@ssism.org) *
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-semibold text-slate-800"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={editFormData.phoneNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-semibold text-slate-800"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Department *
                </label>
                <select
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 bg-white"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Role (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    User Role *
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 bg-white"
                  >
                    <option value="user">Faculty (User)</option>
                    <option value="hod">HOD (Head of Department)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Account Status *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, status: 'active' })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition ${
                      editFormData.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, status: 'inactive' })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition ${
                      editFormData.status === 'inactive'
                        ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FiX className="w-4 h-4 text-rose-600" />
                    <span>Inactive (Deactivated)</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving Details...' : 'Save User Details'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

<<<<<<< HEAD
      {/* Change Department Custom Modal */}
      <Modal isOpen={!!selectedUserForDeptChange} onClose={() => setSelectedUserForDeptChange(null)}>
        {selectedUserForDeptChange && (
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 fade-in">
=======
      {/* ASSIGN FACULTY TO DEPARTMENT MODAL (HOD / Admin) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiUserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Assign Faculty to Department</h3>
                  <p className="text-xs text-slate-500 font-semibold">Assign available faculty to {user?.department || 'department'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignFaculty} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Faculty Member *
                </label>
                {unassignedUsers.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-semibold border border-slate-200">
                    No unassigned faculty available right now.
                  </div>
                ) : (
                  <select
                    value={selectedUnassignedUser}
                    onChange={(e) => setSelectedUnassignedUser(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 bg-white"
                    required
                  >
                    <option value="">-- Select Faculty --</option>
                    {unassignedUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={assigning || unassignedUsers.length === 0}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-sm disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Assign to Department'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE CONFIRMATION DIALOG */}
      {statusConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              statusConfirmUser.status === 'inactive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <FiPower className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-1 capitalize">
              {statusConfirmUser.status === 'inactive' ? 'Activate' : 'Deactivate'} Faculty Account?
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to {statusConfirmUser.status === 'inactive' ? 'activate' : 'deactivate'} <span className="font-bold text-slate-700">{statusConfirmUser.name}</span>'s account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmToggleStatus}
                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition ${
                  statusConfirmUser.status === 'inactive' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {statusConfirmUser.status === 'inactive' ? 'Activation' : 'Deactivation'}
              </button>
              <button
                onClick={() => setStatusConfirmUser(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE FACULTY CONFIRMATION DIALOG */}
      {removeConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiUserMinus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Remove Faculty from Department?</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to remove <span className="font-bold text-slate-700">{removeConfirmUser.name}</span> from <span className="font-bold text-slate-700">{user?.department}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmRemoveFaculty}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition text-sm shadow-md shadow-rose-600/20"
              >
                Confirm Removal
              </button>
              <button
                onClick={() => setRemoveConfirmUser(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Department Modal (Admin Only) */}
      {selectedUserForDeptChange && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in">
>>>>>>> dev_shivalika_02
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
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Target User</p>
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
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsCustomDept(true)}
                        className="text-xs text-orange-600 font-extrabold hover:underline block"
                      >
                        + Add New Custom Department
                      </button>
                    )}
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
<<<<<<< HEAD
        )}
      </Modal>
=======
        </div>
      )}

      {/* Create User Modal (Admin Only) */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl my-auto border border-slate-100 fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiUserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-800">Create User Account</h3>
                  <p className="text-xs text-slate-500 font-semibold">Add a new Faculty, HOD, or Admin to SSES</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Prof. John Von Neumann"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                    value={createUserForm.name}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address *</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="user@ssism.org"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Must be an @ssism.org email domain</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password *</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">User Role *</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 bg-white"
                >
                  <option value="user">Faculty (user)</option>
                  <option value="hod">Head of Department (hod)</option>
                  <option value="admin">System Administrator (admin)</option>
                </select>
              </div>

              {createUserForm.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Department *</label>
                  {!isCustomCreateDept ? (
                    <div className="space-y-2">
                      <select
                        value={createUserForm.department}
                        onChange={(e) => setCreateUserForm({ ...createUserForm, department: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold text-slate-800 bg-white"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCustomCreateDept(true)}
                        className="text-xs text-orange-600 font-extrabold hover:underline block"
                      >
                        + Add Custom Department Name
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter custom department name"
                        value={customCreateDeptName}
                        onChange={(e) => setCustomCreateDeptName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCreateDept(false)}
                        className="text-xs text-slate-500 font-bold hover:underline block"
                      >
                        ← Select from existing department list
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <FiPhone className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                    value={createUserForm.phoneNumber}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{creatingUser ? 'Creating User...' : 'Create User Account'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
>>>>>>> dev_shivalika_02
    </div>
  );
};

export default UserManagementPage;
