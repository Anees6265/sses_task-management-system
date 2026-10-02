import React, { useState, useEffect } from 'react';
import { departmentAPI, userAPI } from '../services/api.jsx';
import { toast } from 'react-toastify';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', status: 'active' });
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
    setFormData({ name: '', code: '', description: '', status: 'active' });
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      status: dept.status || 'active'
    });
    setShowAddEditModal(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      if (editingDept) {
        await departmentAPI.updateDepartment(editingDept._id, formData);
        toast.success('✅ Department updated successfully!');
      } else {
        await departmentAPI.createDepartment(formData);
        toast.success('✅ Department created successfully!');
      }
      setShowAddEditModal(false);
      fetchDepartments();
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl md:text-4xl">🏛️</span>
            <span>Department Management</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            Manage academic and administrative departments, assign HODs, view faculty members, and monitor performance.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition shadow-md flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer"
        >
          <span>➕</span>
          <span>Add Department</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="🔍 Search department by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs md:text-sm font-medium text-gray-600">Status:</span>
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Department Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
            <p className="text-sm">Loading departments...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🏛️</p>
            <p className="text-lg font-medium text-gray-600">No departments found</p>
            <p className="text-xs text-gray-500 mt-1">Try changing your search or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">HOD</th>
                  <th className="py-3 px-4 text-center">Faculty</th>
                  <th className="py-3 px-4 text-center">Total Tasks</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredDepartments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-orange-50/40 transition">
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded">
                          {dept.code}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900">{dept.name}</div>
                          {dept.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{dept.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {dept.hod ? (
                        <div>
                          <span className="font-semibold text-gray-800 block text-xs md:text-sm">{dept.hod.name}</span>
                          <span className="text-xs text-gray-500">{dept.hod.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          ⚠️ Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                      {dept.totalFaculty || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                      {dept.totalTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-green-600">
                      {dept.completedTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                      {dept.pendingTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-red-600">
                      {dept.overdueTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        dept.status === 'active'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {dept.status === 'active' ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleViewDetails(dept)}
                        title="View Details"
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(dept)}
                        title="Edit Department"
                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleOpenHODModal(dept)}
                        title={dept.hod ? 'Change HOD' : 'Assign HOD'}
                        className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                      >
                        👨‍💼
                      </button>
                      <button
                        onClick={() => setStatusConfirmDept(dept)}
                        title={dept.status === 'active' ? 'Deactivate Department' : 'Activate Department'}
                        className={`p-1.5 rounded-lg transition ${
                          dept.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {dept.status === 'active' ? '🛑' : '✅'}
                      </button>
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
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-xs">Loading department analytics...</p>
              </div>
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
                                <td className="py-2.5 px-3 font-semibold text-gray-800">{fac.name}</td>
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
