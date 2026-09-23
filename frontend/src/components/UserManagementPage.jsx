import React, { useState, useEffect, useContext } from 'react';
import { userAPI, departmentAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
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
  FiUser
} from 'react-icons/fi';

const UserManagementPage = ({ onOpenFacultyProfile }) => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
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

  // Modal for creating new user (Admin only)
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

  useEffect(() => {
    fetchUsersData();
    fetchDepartmentsData();
  }, []);

  const fetchUsersData = async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.getAllUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
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

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();

    if (!createUserForm.name.trim()) {
      toast.error('Please enter a user name');
      return;
    }
    const emailVal = createUserForm.email.toLowerCase().trim();
    if (!emailVal.endsWith('@ssism.org')) {
      toast.error('Only @ssism.org email domain is allowed');
      return;
    }
    if (!createUserForm.password || createUserForm.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
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
        email: emailVal,
        password: createUserForm.password,
        role: createUserForm.role,
        phoneNumber: createUserForm.phoneNumber.trim()
      };
      if (createUserForm.role !== 'admin') {
        payload.department = finalDept;
      }

      await userAPI.createUser(payload);
      toast.success(`User "${createUserForm.name}" created successfully!`);

      // Update departments list if custom
      if (isCustomCreateDept && finalDept && !departments.includes(finalDept)) {
        setDepartments(prev => [...prev, finalDept]);
      }

      // Close modal & reset form
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

      // Auto refresh User Directory
      await fetchUsersData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isHOD = user?.role === 'hod';

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'all' || u.department === deptFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    // HOD should only see users in their department
    if (isHOD) {
      const isSameDept = u.department === user?.department;
      return matchesSearch && matchesRole && isSameDept;
    }

    return matchesSearch && matchesDept && matchesRole;
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold text-sm">Loading User Directory...</p>
        </div>
      </div>
    );
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
              ? 'View all institution faculties & staff across departments. Reassign departments or create new user accounts with full admin privileges.' 
              : `View faculties and colleagues in ${user?.department} department.`}
          </p>
        </div>

        {/* Create User Button (Admin Only) */}
        {isAdmin && (
          <div className="relative z-10">
            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl transition shadow-lg shadow-orange-500/30 flex items-center gap-2 text-xs md:text-sm active:scale-95"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>+ Create User</span>
            </button>
          </div>
        )}
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

      {/* Main Records Container */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <FiUsers className="text-orange-500 w-5 h-5" />
              <span>User Records Directory</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Click any faculty row to view complete leave history & profile details
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Department Filter (Admin only) */}
            {isAdmin && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-400 bg-white"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

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
        </div>

        {/* User Table */}
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
                    <td className="p-3.5 text-xs text-slate-600 font-semibold flex items-center gap-1.5 pt-5">
                      <FiMail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.email}</span>
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
                        {/* Admin Department Change Button */}
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

      {/* Change Department Modal (Admin Only) */}
      {selectedUserForDeptChange && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
        </div>
      )}

      {/* Create User Modal (Admin Only) */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 fade-in max-h-[90vh] overflow-y-auto">
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
    </div>
  );
};

export default UserManagementPage;

