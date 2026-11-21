import React, { useState, useEffect, useContext, useMemo } from 'react';
import { userAPI, departmentAPI, taskAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import { notifyDataRefresh } from '../utils/eventBus.js';
import Loader from './Loader.jsx';
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
  FiUserPlus,
  FiLock,
  FiPhone,
  FiUser,
  FiActivity,
  FiClock,
  FiAlertTriangle,
  FiCheckSquare,
  FiPower,
  FiUserMinus,
  FiBarChart2,
  FiTrendingUp,
  FiArrowRight,
  FiLayers
} from 'react-icons/fi';
import { 
  validateEmail, 
  validatePhoneNumber, 
  validatePassword, 
  validateName, 
  formatPhoneInput 
} from '../utils/validation.js';

const UserManagementPage = ({ onOpenFacultyProfile, onFacultyClick }) => {
  const { user } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [departments, setDepartments] = useState(['Computer Science', 'Information Technology', 'Management', 'Electronics & Comm.']);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'workload' | 'performance'

  // Modals
  const [selectedUserForDeptChange, setSelectedUserForDeptChange] = useState(null);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [updating, setUpdating] = useState(false);

  // Edit Faculty Modal
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phoneNumber: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Assign Faculty Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUnassignedUser, setSelectedUnassignedUser] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Status Change Dialog
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);

  // Remove Faculty Dialog
  const [removeConfirmUser, setRemoveConfirmUser] = useState(null);

  // Create User Modal (Admin only)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: 'Computer Science',
    phoneNumber: ''
  });
  const [isCustomCreateDept, setIsCustomCreateDept] = useState(false);
  const [customCreateDeptName, setCustomCreateDeptName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isHOD = user?.role === 'hod';

  useEffect(() => {
    fetchInitialData(true);

    const handleRefresh = (e) => {
      const type = e.detail?.type;
      if (type === 'tasks' || type === 'all') {
        fetchTasksData();
      }
      if (type === 'users' || type === 'all') {
        fetchUsersData();
      }
    };

    window.addEventListener('app_data_refresh', handleRefresh);
    return () => window.removeEventListener('app_data_refresh', handleRefresh);
  }, []);

  const fetchInitialData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      await Promise.all([
        fetchUsersData(),
        fetchTasksData(),
        fetchDepartmentsData(),
        fetchUnassigned()
      ]);
    } catch (error) {
      console.error('Error fetching directory data:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const fetchUsersData = async () => {
    try {
      const { data } = await userAPI.getAllUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load user directory');
    }
  };

  const fetchTasksData = async () => {
    try {
      const { data } = await taskAPI.getTasks();
      const rawTasks = Array.isArray(data) ? data : (data?.data || []);
      setTasksList(rawTasks);
    } catch (error) {
      console.error('Error fetching tasks for workload calculation:', error);
    }
  };

  const fetchDepartmentsData = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments();
      if (data && data.length > 0) {
        const fetchedDepts = data.map(d => typeof d === 'object' ? (d.name || d.code) : String(d));
        setDepartments(Array.from(new Set([...departments, ...fetchedDepts])));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUnassigned = async () => {
    try {
      const { data } = await userAPI.getUnassignedFaculty();
      setUnassignedUsers(data || []);
    } catch (error) {
      console.error('Error fetching unassigned faculty:', error);
    }
  };

  // Helper to calculate exact task-based workload for any user
  const getUserTaskMetrics = useMemo(() => {
    const now = new Date();
    const map = new Map();

    users.forEach(u => {
      const userIdStr = String(u._id || '');
      const userEmail = (u.email || '').trim().toLowerCase();

      const userTasks = tasksList.filter(t => {
        if (!t.assignedTo) return false;
        if (Array.isArray(t.assignedTo)) {
          return t.assignedTo.some(assignee => {
            const aId = String(assignee._id || assignee || '');
            const aEmail = (assignee?.email || '').trim().toLowerCase();
            return (userIdStr && aId === userIdStr) || (userEmail && aEmail && aEmail === userEmail);
          });
        }
        const aId = String(t.assignedTo._id || t.assignedTo || '');
        const aEmail = (t.assignedTo?.email || '').trim().toLowerCase();
        return (userIdStr && aId === userIdStr) || (userEmail && aEmail && aEmail === userEmail);
      });

      const total = userTasks.length;
      const todo = userTasks.filter(t => t.status === 'todo').length;
      const inprogress = userTasks.filter(t => t.status === 'inprogress').length;
      const completed = userTasks.filter(t => t.status === 'completed').length;
      const active = todo + inprogress;
      const overdue = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isFullyCompleted = total > 0 && completed === total;

      // On-time completion metric: calculate ONLY when tasks are 100% completed
      let onTimeRate = null;
      if (isFullyCompleted) {
        const onTimeCompleted = userTasks.filter(t => {
          if (!t.dueDate) return true;
          const compDate = new Date(t.updatedAt || t.createdAt);
          return compDate <= new Date(t.dueDate);
        }).length;
        onTimeRate = Math.round((onTimeCompleted / total) * 100);
      }

      // Workload Level calculation based on active tasks
      let level = {
        label: 'Available',
        badge: 'bg-slate-100 text-slate-600 border-slate-200'
      };

      if (active > 6 || overdue > 1) {
        level = {
          label: 'Overloaded',
          badge: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      } else if (active >= 4) {
        level = {
          label: 'Heavy Load',
          badge: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      } else if (active >= 2) {
        level = {
          label: 'Moderate',
          badge: 'bg-sky-50 text-sky-700 border-sky-200'
        };
      } else if (active === 1) {
        level = {
          label: 'Light Load',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      }

      map.set(userIdStr, {
        total,
        todo,
        inprogress,
        completed,
        active,
        overdue,
        progress,
        isFullyCompleted,
        onTimeRate,
        level,
        tasks: userTasks
      });
    });

    return map;
  }, [users, tasksList]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.department && u.department.toLowerCase().includes(query)) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(query));

      const matchesDept = deptFilter === 'all' || u.department === deptFilter;
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      if (isHOD) {
        const isSameDept = (u.department || '').trim().toLowerCase() === (user?.department || '').trim().toLowerCase();
        return matchesSearch && matchesRole && isSameDept;
      }

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [users, searchQuery, deptFilter, roleFilter, isHOD, user?.department]);

  // Edit Faculty Handlers
  const handleOpenEditModal = (targetUser) => {
    setEditingFaculty(targetUser);
    setEditForm({
      name: targetUser.name || '',
      email: targetUser.email || '',
      phoneNumber: targetUser.phoneNumber || ''
    });
  };

  const handleSaveEditFaculty = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;

    const nameCheck = validateName(editForm.name);
    if (!nameCheck.isValid) {
      toast.error(nameCheck.error);
      return;
    }

    const emailCheck = validateEmail(editForm.email);
    if (!emailCheck.isValid) {
      toast.error(emailCheck.error);
      return;
    }

    const phoneCheck = validatePhoneNumber(editForm.phoneNumber, false);
    if (!phoneCheck.isValid) {
      toast.error(phoneCheck.error);
      return;
    }

    setSavingEdit(true);
    try {
      const { data } = await userAPI.updateUser(editingFaculty._id, {
        name: editForm.name.trim(),
        email: editForm.email.toLowerCase().trim(),
        phoneNumber: phoneCheck.formatted
      });
      toast.success(`Profile updated for ${data.name}`);
      setEditingFaculty(null);
      await Promise.all([fetchUsersData(), fetchTasksData()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update faculty profile');
    } finally {
      setSavingEdit(false);
    }
  };

  // Status Change Handler
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmUser) return;
    const newStatus = statusConfirmUser.status === 'inactive' ? 'active' : 'inactive';
    try {
      await userAPI.toggleUserStatus(statusConfirmUser._id, newStatus);
      toast.success(`Account status changed to ${newStatus} for ${statusConfirmUser.name}`);
      setStatusConfirmUser(null);
      await fetchUsersData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update account status');
    }
  };

  // Assign Faculty Handler
  const handleAssignFaculty = async (e) => {
    e.preventDefault();
    if (!selectedUnassignedUser) {
      toast.error('Please select a faculty member to assign');
      return;
    }
    setAssigning(true);
    try {
      const deptToAssign = user?.role === 'hod' ? user.department : (targetDepartment || departments[0]);
      await userAPI.assignFacultyDepartment(selectedUnassignedUser, deptToAssign);
      toast.success(`Faculty assigned to ${deptToAssign}`);
      setIsAssignModalOpen(false);
      setSelectedUnassignedUser('');
      await Promise.all([fetchUsersData(), fetchUnassigned(), fetchTasksData()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign faculty');
    } finally {
      setAssigning(false);
    }
  };

  // Remove Faculty Handler
  const handleConfirmRemoveFaculty = async () => {
    if (!removeConfirmUser) return;
    try {
      await userAPI.removeFacultyDepartment(removeConfirmUser._id);
      toast.success(`Faculty member ${removeConfirmUser.name} removed from ${user?.department || 'department'}`);
      setRemoveConfirmUser(null);
      await Promise.all([fetchUsersData(), fetchUnassigned(), fetchTasksData()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove faculty');
    }
  };

  // Change Department Handler (Admin Only)
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
      setSelectedUserForDeptChange(null);
      await Promise.all([fetchUsersData(), fetchTasksData()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department');
    } finally {
      setUpdating(false);
    }
  };

  // Create User Handler (Admin Only)
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();

    const nameCheck = validateName(createUserForm.name);
    if (!nameCheck.isValid) {
      toast.error(nameCheck.error);
      return;
    }

    const emailCheck = validateEmail(createUserForm.email);
    if (!emailCheck.isValid) {
      toast.error(emailCheck.error);
      return;
    }

    const passCheck = validatePassword(createUserForm.password);
    if (!passCheck.isValid) {
      toast.error(passCheck.error);
      return;
    }

    const phoneCheck = validatePhoneNumber(createUserForm.phoneNumber, false);
    if (!phoneCheck.isValid) {
      toast.error(phoneCheck.error);
      return;
    }

    const finalDept = isCustomCreateDept ? customCreateDeptName.trim() : createUserForm.department;
    if (createUserForm.role !== 'admin' && !finalDept) {
      toast.error('Please select or specify a department for this user');
      return;
    }

    setCreatingUser(true);
    try {
      const payload = {
        name: createUserForm.name.trim(),
        email: createUserForm.email.toLowerCase().trim(),
        password: createUserForm.password,
        role: createUserForm.role,
        phoneNumber: phoneCheck.formatted
      };
      if (createUserForm.role !== 'admin') {
        payload.department = finalDept;
      }

      await userAPI.createUser(payload);
      toast.success(`Account for "${createUserForm.name}" created successfully!`);

      setIsCreateUserModalOpen(false);
      setCreateUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        department: departments[0] || 'Computer Science',
        phoneNumber: ''
      });
      setIsCustomCreateDept(false);
      setCustomCreateDeptName('');

      await Promise.all([fetchUsersData(), fetchTasksData()]);
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user account');
    } finally {
      setCreatingUser(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 inline-flex items-center gap-1.5">
            <FiShield className="w-3 h-3 text-purple-600" />
            <span>Admin</span>
          </span>
        );
      case 'hod':
        return (
          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
            <FiUserCheck className="w-3 h-3 text-amber-600" />
            <span>HOD</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 text-xs font-bold rounded-lg border border-sky-200 inline-flex items-center gap-1.5">
            <FiUser className="w-3 h-3 text-sky-600" />
            <span>Faculty</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'inactive') {
      return (
        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>Inactive</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Active</span>
      </span>
    );
  };

  // Metrics summary
  const totalFacultyCount = filteredUsers.length;
  const regularFacultyCount = filteredUsers.filter(u => u.role === 'user').length;
  const activeCount = filteredUsers.filter(u => u.status !== 'inactive').length;
  
  // Aggregate active tasks across filtered users
  const totalActiveTasks = useMemo(() => {
    return filteredUsers.reduce((acc, u) => {
      const metrics = getUserTaskMetrics.get(String(u._id || ''));
      return acc + (metrics?.active || 0);
    }, 0);
  }, [filteredUsers, getUserTaskMetrics]);

  if (loading) {
    return <Loader message="Loading Faculty Directory & Workload..." inline />;
  }

  return (
    <div className="space-y-6 fade-in pb-16">
      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        {/* Decorative ambient blur */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isAdmin ? 'Institutional Directory' : `${user?.department || 'Department'} Directory`}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Faculty & Staff Directory
            </h1>

            <p className="text-xs sm:text-sm text-orange-100 font-medium max-w-xl">
              {isHOD 
                ? `Manage faculty appointments, task assignments, and active workloads for ${user?.department}.`
                : 'Complete registry of all faculty members, department heads, and academic task workloads.'}
            </p>
          </div>

          {/* Action Buttons in Banner */}
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {isHOD && (
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="px-4 py-2.5 bg-white text-orange-700 hover:bg-orange-50 font-extrabold rounded-2xl shadow-sm transition active:scale-95 flex items-center gap-2 text-xs sm:text-sm"
              >
                <FiUserPlus className="w-4 h-4" />
                <span>+ Assign Faculty</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(true)}
                className="px-4 py-2.5 bg-white text-orange-700 hover:bg-orange-50 font-extrabold rounded-2xl shadow-sm transition active:scale-95 flex items-center gap-2 text-xs sm:text-sm"
              >
                <FiUserPlus className="w-4 h-4" />
                <span>+ Add New Faculty</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Members */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Members</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
              <FiUsers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800">{totalFacultyCount}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-2">
            Faculty in active view
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-orange-500 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Teaching Faculty */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teaching Faculty</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform">
              <FiUser className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-600">{regularFacultyCount}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-2">
            Course & task instructors
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-sky-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${totalFacultyCount > 0 ? (regularFacultyCount / totalFacultyCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Active Task Workload */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Tasks</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <FiCheckSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{totalActiveTasks}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-2">
            Tasks in progress or to do
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, totalActiveTasks * 10)}%` }}
            />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Status</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{activeCount}</p>
          <p className="text-[11px] font-semibold text-emerald-700 mt-2">
            {totalFacultyCount > 0 ? `${Math.round((activeCount / totalFacultyCount) * 100)}% accounts active` : '100% active'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${totalFacultyCount > 0 ? (activeCount / totalFacultyCount) * 100 : 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. MAIN DIRECTORY CONTAINER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-5">
        
        {/* Navigation Tabs & Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl max-w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'directory'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiUsers className="w-3.5 h-3.5" />
              <span>Faculty Directory ({filteredUsers.length})</span>
            </button>

            {(isHOD || isAdmin) && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('workload')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'workload'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FiBarChart2 className="w-3.5 h-3.5" />
                  <span>Workload Matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('performance')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'performance'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FiTrendingUp className="w-3.5 h-3.5" />
                  <span>Task Performance</span>
                </button>
              </>
            )}
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search faculty or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
            >
              <option value="all">All Roles</option>
              <option value="user">Faculty Only</option>
              <option value="hod">HODs Only</option>
              {isAdmin && <option value="admin">Admins Only</option>}
            </select>

            {/* Department Filter (Admin Only) */}
            {isAdmin && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ================= TAB 1: FACULTY DIRECTORY TABLE ================= */}
        {activeTab === 'directory' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                  <FiUsers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">No Faculty Records Found</p>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                    No faculty members match your active search or filters.
                  </p>
                </div>
                {(searchQuery || deptFilter !== 'all' || roleFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDeptFilter('all');
                      setRoleFilter('all');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 rounded-xl text-xs font-bold transition"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 bg-slate-50/80">
                    <th className="py-3.5 px-4">Faculty Member</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Task Workload</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
                  {filteredUsers.map((u) => {
                    const metrics = getUserTaskMetrics.get(String(u._id || '')) || {
                      total: 0,
                      todo: 0,
                      inprogress: 0,
                      completed: 0,
                      active: 0,
                      overdue: 0,
                      progress: 0,
                      level: { label: 'Available', badge: 'bg-slate-100 text-slate-600 border-slate-200' }
                    };

                    return (
                      <tr key={u._id} className="hover:bg-orange-50/30 transition-colors">
                        {/* Member Details */}
                        <td 
                          className="py-3.5 px-4 cursor-pointer group"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                          title="Click to view full faculty profile"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black flex items-center justify-center text-xs shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                              {u.name?.charAt(0).toUpperCase() || 'F'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-orange-600 transition capitalize truncate">
                                {u.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                ID: {u._id ? String(u._id).slice(-6) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                            <FiMail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </p>
                          {u.phoneNumber && (
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <FiPhone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span>{u.phoneNumber}</span>
                            </p>
                          )}
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                        {/* Department Badge */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 inline-flex items-center gap-1.5 capitalize">
                            <FiBriefcase className="w-3 h-3 text-slate-400" />
                            <span>{u.department || 'Unassigned'}</span>
                          </span>
                        </td>

                        {/* Task-Based Workload Column */}
                        <td className="py-3.5 px-4 min-w-[170px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${metrics.level.badge}`}>
                                {metrics.level.label}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600">
                                {metrics.active} Active / {metrics.total} Total
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${metrics.progress}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                              <span className="text-emerald-600 font-bold">{metrics.completed} Done</span>
                              {metrics.overdue > 0 && (
                                <span className="text-rose-600 font-bold">{metrics.overdue} Overdue</span>
                              )}
                              {onFacultyClick && metrics.total > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFacultyClick(u._id);
                                  }}
                                  className="text-orange-600 hover:underline font-bold"
                                >
                                  View Tasks →
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(u.status)}</td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Faculty */}
                            {(isAdmin || (isHOD && u.role === 'user' && u.department === user?.department)) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(u)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                title="Edit Details"
                              >
                                <FiEdit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Change Department (Admin only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenChangeDeptModal(u)}
                                className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition"
                                title="Change Department"
                              >
                                <FiBriefcase className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Toggle Account Status */}
                            {(isAdmin || (isHOD && u.role === 'user' && u.department === user?.department)) && (
                              <button
                                type="button"
                                onClick={() => setStatusConfirmUser(u)}
                                className={`p-1.5 rounded-lg transition ${
                                  u.status === 'inactive'
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                                title={u.status === 'inactive' ? 'Activate Account' : 'Deactivate Account'}
                              >
                                <FiPower className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Remove from Dept (HOD only) */}
                            {isHOD && u.role === 'user' && u.department === user?.department && (
                              <button
                                type="button"
                                onClick={() => setRemoveConfirmUser(u)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                                title="Remove from Department"
                              >
                                <FiUserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Profile Chevron */}
                            <button
                              type="button"
                              onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition"
                              title="View Full Profile"
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
        )}

        {/* ================= TAB 2: WORKLOAD MATRIX TABLE ================= */}
        {activeTab === 'workload' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 bg-slate-50/80">
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Workload Level</th>
                  <th className="py-3.5 px-4">Total Tasks</th>
                  <th className="py-3.5 px-4">To Do</th>
                  <th className="py-3.5 px-4">In Progress</th>
                  <th className="py-3.5 px-4">Completed</th>
                  <th className="py-3.5 px-4">Completion Progress</th>
                  <th className="py-3.5 px-4 text-right">Overdue Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-400 text-xs">
                      No workload data available.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const metrics = getUserTaskMetrics.get(String(u._id || '')) || {
                      total: 0,
                      todo: 0,
                      inprogress: 0,
                      completed: 0,
                      active: 0,
                      overdue: 0,
                      progress: 0,
                      level: { label: 'Available', badge: 'bg-slate-100 text-slate-600 border-slate-200' }
                    };

                    return (
                      <tr key={u._id} className="hover:bg-orange-50/30 transition-colors">
                        {/* Member */}
                        <td 
                          className="py-3.5 px-4 cursor-pointer group"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 group-hover:text-orange-600 transition capitalize">
                                {u.name}
                              </p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {u.department || 'Unassigned'}
                        </td>

                        {/* Workload Level Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-md border ${metrics.level.badge}`}>
                            {metrics.level.label}
                          </span>
                        </td>

                        {/* Total Tasks */}
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {metrics.total}
                        </td>

                        {/* To Do */}
                        <td className="py-3.5 px-4 font-bold text-indigo-600">
                          {metrics.todo}
                        </td>

                        {/* In Progress */}
                        <td className="py-3.5 px-4 font-bold text-amber-600">
                          {metrics.inprogress}
                        </td>

                        {/* Completed */}
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {metrics.completed}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3.5 px-4 min-w-[130px]">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600">{metrics.progress}%</span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all"
                                style={{ width: `${metrics.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Overdue */}
                        <td className="py-3.5 px-4 text-right">
                          {metrics.overdue > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md font-extrabold text-[11px]">
                              {metrics.overdue} Overdue
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">0 on track</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 3: TASK PERFORMANCE TABLE ================= */}
        {activeTab === 'performance' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 bg-slate-50/80">
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Assigned Tasks</th>
                  <th className="py-3.5 px-4">Completed</th>
                  <th className="py-3.5 px-4">Completion Rate</th>
                  <th className="py-3.5 px-4">On-Time Rate</th>
                  <th className="py-3.5 px-4">Overdue Tasks</th>
                  <th className="py-3.5 px-4 text-right">Performance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400 text-xs">
                      No performance data recorded.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const metrics = getUserTaskMetrics.get(String(u._id || '')) || {
                      total: 0,
                      todo: 0,
                      inprogress: 0,
                      completed: 0,
                      active: 0,
                      overdue: 0,
                      progress: 0,
                      isFullyCompleted: false,
                      onTimeRate: null
                    };

                    let rating = 'On Track';
                    let ratingBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';

                    if (metrics.overdue > 1 || (metrics.progress < 30 && metrics.total >= 4)) {
                      rating = 'Needs Attention';
                      ratingBadge = 'bg-rose-50 text-rose-800 border-rose-200';
                    } else if (metrics.isFullyCompleted) {
                      rating = (metrics.onTimeRate !== null && metrics.onTimeRate >= 80) ? 'High Performer' : 'Completed';
                      ratingBadge = (metrics.onTimeRate !== null && metrics.onTimeRate >= 80) ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    } else if (metrics.total === 0) {
                      rating = 'Unassigned';
                      ratingBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                    }

                    return (
                      <tr key={u._id} className="hover:bg-orange-50/30 transition-colors">
                        <td 
                          className="py-3.5 px-4 cursor-pointer group"
                          onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(u)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 group-hover:text-orange-600 transition capitalize">
                                {u.name}
                              </p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {u.department || 'General'}
                        </td>

                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {metrics.total}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {metrics.completed}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {metrics.progress}%
                        </td>

                        <td className="py-3.5 px-4">
                          {metrics.isFullyCompleted && metrics.onTimeRate !== null ? (
                            <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-lg border ${
                              metrics.onTimeRate >= 80 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : metrics.onTimeRate >= 50 
                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {metrics.onTimeRate}%
                            </span>
                          ) : metrics.total > 0 ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-lg border border-slate-200 inline-block" title="All tasks must be 100% completed to calculate On-Time Rate">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-rose-600">
                          {metrics.overdue}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${ratingBadge}`}>
                            {rating}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ================= MODALS ================= */}

      {/* EDIT FACULTY MODAL */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiEdit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Edit Faculty Profile</h3>
                  <p className="text-xs text-slate-500">Update name, email, and contact info</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingFaculty(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFaculty} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="faculty@ssism.org"
                  pattern="[a-zA-Z0-9._%+\-]+@ssism\.org"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Must belong to @ssism.org domain</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  maxLength={15}
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: formatPhoneInput(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">Include +91 country code (e.g. +91 9876543210)</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-xs sm:text-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Profile Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFaculty(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN FACULTY MODAL (HOD / Admin) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiUserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Assign Faculty</h3>
                  <p className="text-xs text-slate-500">Assign faculty to {user?.department || 'department'}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
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
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-bold text-slate-800 bg-white"
                    required
                  >
                    <option value="">-- Choose Faculty Member --</option>
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
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-xs sm:text-sm disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Assign to Department'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              statusConfirmUser.status === 'inactive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <FiPower className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 capitalize">
                {statusConfirmUser.status === 'inactive' ? 'Activate' : 'Deactivate'} Account?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to {statusConfirmUser.status === 'inactive' ? 'activate' : 'deactivate'}{' '}
                <span className="font-bold text-slate-700">{statusConfirmUser.name}</span>'s portal account?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition ${
                  statusConfirmUser.status === 'inactive' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {statusConfirmUser.status === 'inactive' ? 'Activation' : 'Deactivation'}
              </button>
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE FACULTY CONFIRMATION DIALOG */}
      {removeConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <FiUserMinus className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800">Remove from Department?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Remove <span className="font-bold text-slate-700">{removeConfirmUser.name}</span> from{' '}
                <span className="font-bold text-slate-700">{user?.department}</span>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmRemoveFaculty}
                className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition text-xs sm:text-sm shadow-md shadow-rose-600/20"
              >
                Confirm Removal
              </button>
              <button
                type="button"
                onClick={() => setRemoveConfirmUser(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE DEPARTMENT MODAL (Admin Only) */}
      {selectedUserForDeptChange && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl my-auto max-h-[90vh] overflow-y-auto border border-slate-100 fade-in space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiBriefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Change Department</h3>
                  <p className="text-xs text-slate-500">Reassign faculty to a new department</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedUserForDeptChange(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartmentChange} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Faculty Member</p>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{selectedUserForDeptChange.name}</p>
                <p className="text-xs text-slate-500">{selectedUserForDeptChange.email}</p>
                <p className="text-xs font-bold text-orange-600 mt-1">Current: {selectedUserForDeptChange.department || 'Unassigned'}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select New Department *
                </label>
                
                {!isCustomDept ? (
                  <div className="space-y-2.5">
                    <select
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-bold text-slate-800 bg-white"
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
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Enter new department name"
                      value={customDeptName}
                      onChange={(e) => setCustomDeptName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomDept(false)}
                      className="text-xs text-slate-500 font-bold hover:underline block"
                    >
                      ← Choose from existing departments
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-xs sm:text-sm disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Department'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForDeptChange(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (Admin Only) */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl my-auto border border-slate-100 fade-in max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                  <FiUserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Register New Member</h3>
                  <p className="text-xs text-slate-500">Create login credentials and assign role</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Verma / Prof. Amit Sharma"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                    value={createUserForm.name}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address *</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="faculty.name@ssism.org"
                    pattern="[a-zA-Z0-9._%+\-]+@ssism\.org"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Must belong to @ssism.org domain</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password *</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    placeholder="8-18 characters"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                    required
                    minLength={8}
                    maxLength={18}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Role *</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-bold text-slate-800 bg-white"
                >
                  <option value="user">Teaching Faculty</option>
                  <option value="hod">Head of Department (HOD)</option>
                  <option value="admin">System Administrator</option>
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
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-bold text-slate-800 bg-white"
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
                        + Define New Department
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter department title"
                        value={customCreateDeptName}
                        onChange={(e) => setCustomCreateDeptName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCreateDept(false)}
                        className="text-xs text-slate-500 font-bold hover:underline block"
                      >
                        ← Select from registered departments list
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm font-medium text-slate-800"
                    value={createUserForm.phoneNumber}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, phoneNumber: formatPhoneInput(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-xs sm:text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{creatingUser ? 'Registering...' : 'Register Faculty'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-xs sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
