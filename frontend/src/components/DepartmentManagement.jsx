import React, { useState, useEffect } from 'react';
import { departmentAPI, userAPI } from '../services/api.jsx';
import { toast } from 'react-toastify';
import Loader from './Loader.jsx';
import { validatePhoneNumber, formatPhoneInput } from '../utils/validation.js';
import { notifyDataRefresh } from '../utils/eventBus.js';
import { 
  FiBriefcase, 
  FiUsers, 
  FiPlus, 
  FiEye, 
  FiEdit3, 
  FiUserCheck, 
  FiPower, 
  FiSearch, 
  FiCheckCircle, 
  FiShield, 
  FiX, 
  FiCheckSquare, 
  FiAlertCircle,
  FiClock
} from 'react-icons/fi';

const DepartmentManagement = ({ onSelectDepartment, onOpenFacultyProfile }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', phoneNumber: '+91 ', status: 'active' });
  const [modalLoading, setModalLoading] = useState(false);

  // HOD Assignment modal state
  const [showHODModal, setShowHODModal] = useState(false);
  const [selectedDeptForHOD, setSelectedDeptForHOD] = useState(null);
  const [availableHODs, setAvailableHODs] = useState([]);
  const [selectedHodId, setSelectedHodId] = useState('');
  const [hodConfirmStep, setHodConfirmStep] = useState(false);

  // Toggle status confirm modal
  const [statusConfirmDept, setStatusConfirmDept] = useState(null);

  // View Details modal state
  const [viewDetailsDept, setViewDetailsDept] = useState(null);
  const [deptDetailsData, setDeptDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');

  useEffect(() => {
    fetchDepartments();
    fetchHODUsers();
  }, [statusFilter]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data } = await departmentAPI.getAdminDepartments({ status: statusFilter });
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchHODUsers = async () => {
    try {
      const { data } = await userAPI.getAllUsers();
      const hodsOnly = data.filter(u => u.role === 'hod');
      setAvailableHODs(hodsOnly);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', description: '', phoneNumber: '+91 ', status: 'active' });
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      phoneNumber: dept.phoneNumber || '+91 ',
      status: dept.status || 'active'
    });
    setShowAddEditModal(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      toast.error('Department name is required', { position: 'top-center' });
      return;
    }

    if (!formData.code || !formData.code.trim()) {
      toast.error('Department code is required', { position: 'top-center' });
      return;
    }

    // 10-digit mobile number validation
    const phoneCheck = validatePhoneNumber(formData.phoneNumber, true);
    if (!phoneCheck.isValid) {
      toast.error(phoneCheck.error || 'Please enter a valid 10-digit mobile number', { position: 'top-center' });
      return;
    }

    setModalLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        phoneNumber: phoneCheck.formatted
      };

      if (editingDept) {
        await departmentAPI.updateDepartment(editingDept._id, payload);
        toast.success('✅ Department updated successfully!');
      } else {
        await departmentAPI.createDepartment(payload);
        toast.success('✅ Department created successfully!');
      }
      setShowAddEditModal(false);
      fetchDepartments();
      // Notify all other components (Sidebar, Kanban, UserManagement) to dynamically refresh departments
      notifyDataRefresh('departments');
      notifyDataRefresh('all');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save department');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusConfirmDept) return;
    const newStatus = statusConfirmDept.status === 'active' ? 'inactive' : 'active';
    try {
      await departmentAPI.toggleDepartmentStatus(statusConfirmDept._id, newStatus);
      toast.success(`Department ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      setStatusConfirmDept(null);
      fetchDepartments();
      notifyDataRefresh('departments');
      notifyDataRefresh('all');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department status');
    }
  };

  const handleOpenHODModal = (dept) => {
    setSelectedDeptForHOD(dept);
    setSelectedHodId(dept.hod ? dept.hod._id : '');
    setHodConfirmStep(false);
    setShowHODModal(true);
  };

  const handleSaveHOD = async () => {
    if (!selectedHodId) {
      toast.error('Please select an HOD');
      return;
    }

    const currentHod = selectedDeptForHOD.hod;
    // If there is an existing HOD and it's different, show confirmation step first
    if (currentHod && currentHod._id !== selectedHodId && !hodConfirmStep) {
      setHodConfirmStep(true);
      return;
    }

    setModalLoading(true);
    try {
      if (currentHod) {
        await departmentAPI.changeHOD(selectedDeptForHOD._id, selectedHodId);
        toast.success('✅ HOD changed successfully!');
      } else {
        await departmentAPI.assignHOD(selectedDeptForHOD._id, selectedHodId);
        toast.success('✅ HOD assigned successfully!');
      }
      setShowHODModal(false);
      fetchDepartments();
      notifyDataRefresh('departments');
      notifyDataRefresh('all');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign HOD');
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewDetails = async (dept) => {
    setViewDetailsDept(dept);
    setDetailsLoading(true);
    setDetailsTab('overview');
    try {
      const { data } = await departmentAPI.getDepartmentById(dept._id);
      setDeptDetailsData(data);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Failed to load department details');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filtered departments list by search
  const filteredDepartments = departments.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiBriefcase className="w-3.5 h-3.5" />
              Sant Singaji Educational Society — Department Governance
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>Academic Department Management</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Institutional divisions, appointed Heads of Department (HODs), allocated teaching faculty, and curricular deliverable milestones across all academic centers.
          </p>
        </div>

        <div className="relative z-10">
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl transition shadow-lg shadow-orange-500/30 flex items-center gap-2 text-xs md:text-sm active:scale-95 cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>+ Add Department</span>
          </button>
        </div>
      </div>

      {/* Department Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Divisions</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{departments.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Departments</p>
          <span className="text-[10px] text-slate-400">Institutional centers</span>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Operational</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">
            {departments.filter(d => d.status === 'active').length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Academic Divisions</p>
          <span className="text-[10px] text-slate-400">Functioning curricula</span>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
              <FiUserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">Leadership</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-purple-600">
            {departments.filter(d => d.hod).length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Appointed HODs</p>
          <span className="text-[10px] text-slate-400">Department chairpersons</span>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FiUsers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Faculty</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {departments.reduce((acc, d) => acc + (d.totalFaculty || 0), 0)}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Allocated Faculty</p>
          <span className="text-[10px] text-slate-400">Teaching cadre</span>
        </div>
      </div>


      {/* Search & Filter Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search department title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status Filter:</span>
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Department Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <Loader message="Loading Academic Departments..." inline />
        ) : filteredDepartments.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <FiBriefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Departments Found</p>
            <p className="text-xs text-slate-400 mt-1">There are no academic departments matching your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 rounded-l-2xl">Academic Department & Code</th>
                  <th className="py-3.5 px-4">Appointed HOD</th>
                  <th className="py-3.5 px-4 text-center">Faculty Strength</th>
                  <th className="py-3.5 px-4 text-center">Total Tasks</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4 text-center">Overdue</th>
                  <th className="py-3.5 px-4 text-center">Operational Status</th>
                  <th className="py-3.5 px-4 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredDepartments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="bg-orange-100 text-orange-800 text-xs font-extrabold px-2.5 py-1 rounded-xl border border-orange-200">
                          {dept.code}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{dept.name}</div>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {dept.phoneNumber && (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                📞 {dept.phoneNumber}
                              </span>
                            )}
                            {dept.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">{dept.description}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {dept.hod ? (
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{dept.hod.name}</span>
                          <span className="text-[11px] text-slate-400">{dept.hod.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 inline-flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3 text-amber-500" /> Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {dept.totalFaculty || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                      {dept.totalTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {dept.completedTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                      {dept.pendingTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-rose-600">
                      {dept.overdueTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                        dept.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {dept.status === 'active' ? <><FiCheckCircle className="w-3 h-3" /> Active</> : <><FiPower className="w-3 h-3" /> Inactive</>}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(dept)}
                          title="Inspect Department & Faculty Workloads"
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(dept)}
                          title="Edit Department Division"
                          className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition"
                        >
                          <FiEdit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenHODModal(dept)}
                          title={dept.hod ? 'Reassign Department HOD' : 'Appoint Department HOD'}
                          className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition"
                        >
                          <FiUserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setStatusConfirmDept(dept)}
                          title={dept.status === 'active' ? 'Deactivate Department' : 'Activate Department'}
                          className={`p-2 rounded-xl transition ${
                            dept.status === 'active'
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <FiPower className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Department Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>{editingDept ? '✏️ Edit Department' : '🏛️ Create Department'}</span>
            </h3>
            
            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department Contact / Mobile Number * (10 Digits)</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9876543210"
                  maxLength={15}
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneInput(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                />
                <p className="text-[11px] text-gray-400 font-medium mt-1">
                  Must be a valid 10-digit mobile number with +91 (e.g. +91 9876543210)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Brief description of the department..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow text-sm disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : (editingDept ? 'Update Department' : 'Create Department')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Change HOD Modal */}
      {showHODModal && selectedDeptForHOD && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>👨‍💼 {selectedDeptForHOD.hod ? 'Change HOD' : 'Assign HOD'}</span>
            </h3>

            <p className="text-xs text-gray-600 mb-4">
              Department: <span className="font-bold text-gray-900">{selectedDeptForHOD.name} ({selectedDeptForHOD.code})</span>
            </p>

            {/* Current HOD display */}
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs text-gray-500 font-medium block mb-1">Current HOD:</span>
              {selectedDeptForHOD.hod ? (
                <div className="font-semibold text-gray-800 text-sm">
                  {selectedDeptForHOD.hod.name} ({selectedDeptForHOD.hod.email})
                </div>
              ) : (
                <span className="text-xs text-amber-600 font-semibold">None assigned yet</span>
              )}
            </div>

            {!hodConfirmStep ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select New HOD *</label>
                  <select
                    value={selectedHodId}
                    onChange={(e) => setSelectedHodId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                  >
                    <option value="">-- Choose HOD --</option>
                    {availableHODs.map(h => (
                      <option key={h._id} value={h._id}>
                        {h.name} ({h.email}) - {h.department || 'Unassigned'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-3 border-t">
                  <button
                    onClick={handleSaveHOD}
                    disabled={!selectedHodId || modalLoading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition shadow text-sm disabled:opacity-50"
                  >
                    {selectedDeptForHOD.hod ? 'Proceed to Change HOD' : 'Assign HOD'}
                  </button>
                  <button
                    onClick={() => setShowHODModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Confirmation warning step before changing HOD
              <div className="space-y-4 bg-orange-50 border border-orange-200 p-4 rounded-xl">
                <h4 className="font-bold text-orange-800 text-sm flex items-center gap-1.5">
                  <span>⚠️ Confirm HOD Change</span>
                </h4>
                <div className="text-xs text-gray-700 space-y-2">
                  <p>
                    <strong>Current HOD:</strong> {selectedDeptForHOD.hod?.name}
                  </p>
                  <p>
                    <strong>New HOD:</strong> {availableHODs.find(h => h._id === selectedHodId)?.name}
                  </p>
                  <p className="text-gray-500">
                    The previous HOD's task/activity history will be safely preserved, and their account will not be deleted.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveHOD}
                    disabled={modalLoading}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition text-xs"
                  >
                    {modalLoading ? 'Updating...' : 'Yes, Confirm Change'}
                  </button>
                  <button
                    onClick={() => setHodConfirmStep(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-xs"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activate / Deactivate Confirm Modal */}
      {statusConfirmDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>{statusConfirmDept.status === 'active' ? '🛑 Deactivate Department' : '✅ Activate Department'}</span>
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to {statusConfirmDept.status === 'active' ? 'deactivate' : 'activate'} <strong className="text-gray-900">{statusConfirmDept.name}</strong>?
            </p>
            {statusConfirmDept.status === 'active' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg mb-4">
                ℹ️ Soft deactivation will keep associated faculty, HODs, tasks, and historical records completely intact.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleToggleStatus}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-white transition text-sm ${
                  statusConfirmDept.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Yes, {statusConfirmDept.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => setStatusConfirmDept(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Details Modal */}
      {viewDetailsDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-3xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b pb-3">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <span>🏛️ {viewDetailsDept.name}</span>
                  <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded">
                    {viewDetailsDept.code}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">{viewDetailsDept.description || 'No description provided.'}</p>
              </div>
              <button
                onClick={() => setViewDetailsDept(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-light leading-none"
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <Loader message="Loading Department Analytics..." inline />
            ) : (
              <div className="space-y-6">
                {/* Tabs */}
                <div className="flex border-b gap-4 text-sm font-semibold">
                  <button
                    onClick={() => setDetailsTab('overview')}
                    className={`pb-2 border-b-2 transition ${
                      detailsTab === 'overview' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    Overview & Stats
                  </button>
                  <button
                    onClick={() => setDetailsTab('faculty')}
                    className={`pb-2 border-b-2 transition ${
                      detailsTab === 'faculty' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    Faculty Members ({deptDetailsData?.faculty?.length || 0})
                  </button>
                </div>

                {detailsTab === 'overview' && (
                  <div className="space-y-6">
                    {/* HOD Info Box */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider block">Head of Department (HOD)</span>
                        {deptDetailsData?.department?.hod ? (
                          <div className="mt-1">
                            <span className="text-lg font-bold text-gray-900 block">{deptDetailsData.department.hod.name}</span>
                            <span className="text-xs text-gray-600">{deptDetailsData.department.hod.email}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-amber-700 block mt-1">⚠️ No HOD currently assigned</span>
                        )}
                      </div>
                      <span className="text-3xl">👨‍💼</span>
                    </div>

                    {/* Department Task Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                        <span className="text-xs font-medium text-gray-500 block">Total Tasks</span>
                        <span className="text-2xl font-bold text-gray-800">{deptDetailsData?.stats?.totalTasks || 0}</span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                        <span className="text-xs font-medium text-blue-600 block">To Do</span>
                        <span className="text-2xl font-bold text-blue-700">{deptDetailsData?.stats?.todo || 0}</span>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-center">
                        <span className="text-xs font-medium text-orange-600 block">In Progress</span>
                        <span className="text-2xl font-bold text-orange-700">{deptDetailsData?.stats?.inprogress || 0}</span>
                      </div>
                      <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-center">
                        <span className="text-xs font-medium text-green-600 block">Completed</span>
                        <span className="text-2xl font-bold text-green-700">{deptDetailsData?.stats?.completed || 0}</span>
                      </div>
                    </div>

                    {/* Completion rate bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                        <span>Overall Completion Rate</span>
                        <span>{deptDetailsData?.stats?.completionRate || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${deptDetailsData?.stats?.completionRate || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Priorities breakdown */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3">Tasks by Priority</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                          <span className="text-xs font-semibold text-red-600 block">High Priority</span>
                          <span className="text-lg font-bold text-red-700">{deptDetailsData?.stats?.highPriority || 0}</span>
                        </div>
                        <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <span className="text-xs font-semibold text-yellow-700 block">Medium Priority</span>
                          <span className="text-lg font-bold text-yellow-800">{deptDetailsData?.stats?.mediumPriority || 0}</span>
                        </div>
                        <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
                          <span className="text-xs font-semibold text-green-600 block">Low Priority</span>
                          <span className="text-lg font-bold text-green-700">{deptDetailsData?.stats?.lowPriority || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {detailsTab === 'faculty' && (
                  <div className="space-y-3">
                    {deptDetailsData?.faculty?.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-3xl mb-1">👥</p>
                        <p className="text-sm text-gray-500">No faculty members found in this department.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b text-gray-600 font-semibold">
                              <th className="py-2.5 px-3">Faculty Name</th>
                              <th className="py-2.5 px-3">Email</th>
                              <th className="py-2.5 px-3 text-center">Assigned Tasks</th>
                              <th className="py-2.5 px-3 text-center">Completed</th>
                              <th className="py-2.5 px-3 text-center">Pending</th>
                              <th className="py-2.5 px-3 text-center">Overdue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {deptDetailsData?.faculty?.map((fac) => (
                              <tr key={fac._id} className="hover:bg-gray-50">
                                <td className="py-2.5 px-3 font-semibold text-gray-800">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewDetailsDept(null);
                                      if (onOpenFacultyProfile) {
                                        onOpenFacultyProfile(fac);
                                      }
                                    }}
                                    className="text-left font-bold text-slate-800 hover:text-orange-600 transition flex items-center gap-2 group"
                                    title="Click to view complete faculty profile"
                                  >
                                    <span>{fac.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-orange-100 group-hover:bg-orange-500 text-orange-700 group-hover:text-white rounded-full font-bold transition">
                                      View Profile
                                    </span>
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 text-gray-600">{fac.email}</td>
                                <td className="py-2.5 px-3 text-center font-bold">{fac.totalTasks}</td>
                                <td className="py-2.5 px-3 text-center text-green-600 font-bold">{fac.completedTasks}</td>
                                <td className="py-2.5 px-3 text-center text-orange-600 font-bold">{fac.pendingTasks}</td>
                                <td className="py-2.5 px-3 text-center text-red-600 font-bold">{fac.overdueTasks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
