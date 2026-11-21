import React, { useState, useEffect, useMemo } from 'react';
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
  FiAlertCircle,
  FiCalendar,
  FiMail,
  FiPhone,
  FiChevronLeft,
  FiChevronRight,
  FiArrowRight,
  FiInfo
} from 'react-icons/fi';

const DepartmentManagement = ({ setActiveView, onSelectDepartment, onOpenFacultyProfile }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Add / Edit Department Modal state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    phoneNumber: '+91 ',
    hodId: '',
    status: 'active'
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Available HODs for Creation / Assignment
  const [availableHODs, setAvailableHODs] = useState([]);
  const [loadingHODs, setLoadingHODs] = useState(false);

  // Change HOD Modal state
  const [showHODModal, setShowHODModal] = useState(false);
  const [selectedDeptForHOD, setSelectedDeptForHOD] = useState(null);
  const [changeHodOptions, setChangeHodOptions] = useState([]);
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
    fetchAvailableHODs();
  }, [statusFilter]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Listen to open_add_department_modal event from Sidebar
  useEffect(() => {
    const handleOpenAdd = () => {
      handleOpenCreateModal();
    };
    window.addEventListener('open_add_department_modal', handleOpenAdd);
    return () => window.removeEventListener('open_add_department_modal', handleOpenAdd);
  }, [availableHODs]);

  // Handle Escape key to close active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (statusConfirmDept) {
          setStatusConfirmDept(null);
        } else if (showHODModal) {
          setShowHODModal(false);
          setHodConfirmStep(false);
        } else if (viewDetailsDept) {
          setViewDetailsDept(null);
        } else if (showAddEditModal) {
          setShowAddEditModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [statusConfirmDept, showHODModal, viewDetailsDept, showAddEditModal]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data } = await departmentAPI.getAdminDepartments({ status: statusFilter });
      setDepartments(Array.isArray(data) ? data : (data?.departments || []));
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableHODs = async () => {
    setLoadingHODs(true);
    try {
      const { data } = await userAPI.getAvailableHODs();
      setAvailableHODs(data || []);
    } catch (error) {
      console.error('Error fetching available HODs:', error);
    } finally {
      setLoadingHODs(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setEditingDept(null);
    await fetchAvailableHODs();

    // Check for preserved unsaved draft in sessionStorage
    const savedDraft = sessionStorage.getItem('dept_form_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData({
          name: parsed.name || '',
          code: parsed.code || '',
          description: parsed.description || '',
          phoneNumber: parsed.phoneNumber || '+91 ',
          hodId: parsed.hodId || '',
          status: 'active'
        });
        toast.info('Restored your unsaved department form draft', { autoClose: 3000 });
      } catch (e) {
        setFormData({ name: '', code: '', description: '', phoneNumber: '+91 ', hodId: '', status: 'active' });
      }
    } else {
      setFormData({ name: '', code: '', description: '', phoneNumber: '+91 ', hodId: '', status: 'active' });
    }

    setShowAddEditModal(true);
  };

  const handleNavigateToCreateHOD = () => {
    // Preserve unsaved form data in sessionStorage
    sessionStorage.setItem('dept_form_draft', JSON.stringify(formData));
    setShowAddEditModal(false);

    if (setActiveView) {
      setActiveView('users');
      toast.info('Create an HOD account with role "HOD", then return here to complete department creation.', {
        autoClose: 6000
      });
    } else {
      toast.info('Please navigate to User Management to create an HOD account.');
    }
  };

  const handleOpenEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      phoneNumber: dept.phoneNumber || '+91 ',
      hodId: dept.hodId?._id || dept.hod?._id || dept.hodId || dept.hod || '',
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

    // When creating a new department, HOD selection is MANDATORY
    if (!editingDept && !formData.hodId) {
      toast.error('HOD selection is mandatory. Every active department must have an assigned active HOD.', {
        position: 'top-center'
      });
      return;
    }

    // Mobile number validation (if provided)
    let formattedPhone = '';
    if (formData.phoneNumber && String(formData.phoneNumber).replace(/[\s-]/g, '') !== '+91' && String(formData.phoneNumber).trim() !== '') {
      const phoneCheck = validatePhoneNumber(formData.phoneNumber, true);
      if (!phoneCheck.isValid) {
        toast.error(phoneCheck.error || 'Please enter a valid 10-digit mobile number', { position: 'top-center' });
        return;
      }
      formattedPhone = phoneCheck.formatted;
    }

    setModalLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description ? formData.description.trim() : '',
        phoneNumber: formattedPhone,
        hodId: formData.hodId,
        status: formData.status || 'active'
      };

      if (editingDept) {
        await departmentAPI.updateDepartment(editingDept._id, payload);
        toast.success(`✅ Department "${payload.name}" updated successfully!`);
      } else {
        const res = await departmentAPI.createDepartment(payload);
        toast.success(res.data?.message || `✅ Department "${payload.name}" created successfully with assigned HOD!`);
        // Clear saved draft on success
        sessionStorage.removeItem('dept_form_draft');
      }

      setShowAddEditModal(false);
      await fetchDepartments();
      await fetchAvailableHODs();

      // Notify all components across the app to dynamically refresh
      notifyDataRefresh('departments');
      notifyDataRefresh('users');
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
      await fetchDepartments();
      await fetchAvailableHODs();
      notifyDataRefresh('departments');
      notifyDataRefresh('all');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update department status');
    }
  };

  const handleOpenHODModal = async (dept) => {
    setSelectedDeptForHOD(dept);
    setSelectedHodId('');
    setHodConfirmStep(false);
    setShowHODModal(true);

    try {
      const { data } = await userAPI.getAvailableHODs({ excludeDepartmentId: dept._id });
      setChangeHodOptions(data || []);
    } catch (err) {
      console.error('Error fetching eligible HODs:', err);
    }
  };

  const handleSaveHOD = async () => {
    if (!selectedHodId) {
      toast.error('Please choose an eligible HOD to assign');
      return;
    }

    if (!hodConfirmStep) {
      setHodConfirmStep(true);
      return;
    }

    setModalLoading(true);
    try {
      await departmentAPI.changeHOD(selectedDeptForHOD._id, selectedHodId);
      toast.success('✅ Department HOD updated successfully!');
      setShowHODModal(false);
      await fetchDepartments();
      await fetchAvailableHODs();
      notifyDataRefresh('departments');
      notifyDataRefresh('users');
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

  // Filter departments by search query (name or code)
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  // Paginated departments
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage) || 1;
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDepartments.slice(start, start + itemsPerPage);
  }, [filteredDepartments, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiBriefcase className="w-3.5 h-3.5" />
              Academic Governance & Department Control
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>Academic Department Management</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Institutional departments, appointed Heads of Department (HODs), active faculty strength, and curricular deliverable milestones.
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Divisions</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{departments.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Departments</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Operational</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">
            {departments.filter(d => d.status === 'active').length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Departments</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
              <FiUserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">Leadership</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-purple-600">
            {departments.filter(d => d.hod || d.hodId).length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Assigned HODs</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FiUsers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Available HODs</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {availableHODs.length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Unassigned Active HODs</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by department name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status:</span>
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Department Listing Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
        {loading ? (
          <Loader message="Loading Academic Departments..." inline />
        ) : filteredDepartments.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <FiBriefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Departments Found</p>
            <p className="text-xs text-slate-400 mt-1">There are no departments matching your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Department Name</th>
                  <th className="py-3.5 px-3">Code</th>
                  <th className="py-3.5 px-4">HOD Name</th>
                  <th className="py-3.5 px-4">HOD Email</th>
                  <th className="py-3.5 px-3 text-center">Faculty Count</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-center">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {paginatedDepartments.map((dept) => {
                  const hod = dept.hod || dept.hodId;
                  const createdDate = dept.createdAt 
                    ? new Date(dept.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  return (
                    <tr key={dept._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{dept.name}</span>
                          {dept.description && (
                            <span className="text-[11px] text-slate-400 truncate max-w-xs">{dept.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-orange-100 text-orange-800 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-orange-200">
                          {dept.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {hod ? (
                          <div className="font-bold text-slate-800 text-xs">{hod.name}</div>
                        ) : (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                            <FiAlertCircle className="w-3 h-3 text-amber-500" /> None Assigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {hod?.email || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                        {dept.facultyCount !== undefined ? dept.facultyCount : (dept.totalFaculty || 0)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                          dept.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {dept.status === 'active' ? <><FiCheckCircle className="w-3 h-3" /> Active</> : <><FiPower className="w-3 h-3" /> Inactive</>}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center text-xs text-slate-500 font-medium">
                        {createdDate}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDetails(dept)}
                            title="View Department Details"
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(dept)}
                            title="Edit Department"
                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition cursor-pointer"
                          >
                            <FiEdit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenHODModal(dept)}
                            title="Change Department HOD"
                            className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition cursor-pointer"
                          >
                            <FiUserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setStatusConfirmDept(dept)}
                            title={dept.status === 'active' ? 'Deactivate Department' : 'Activate Department'}
                            className={`p-2 rounded-xl transition cursor-pointer ${
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredDepartments.length > itemsPerPage && (
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDepartments.length)} of {filteredDepartments.length} departments
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 transition font-bold flex items-center gap-1 cursor-pointer"
              >
                <FiChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 rounded-lg font-bold transition cursor-pointer ${
                    currentPage === idx + 1
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 transition font-bold flex items-center gap-1 cursor-pointer"
              >
                Next <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Department Modal */}
      {showAddEditModal && (
        <div 
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddEditModal(false); }}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl relative border border-slate-100 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <FiBriefcase className="w-5 h-5 text-orange-500" />
                <span>{editingDept ? 'Edit Academic Department' : 'Create New Department'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              {/* Department Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science and Engineering"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                />
              </div>

              {/* Department Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">Short unique institutional identifier (e.g. CSE, IT, ME)</p>
              </div>

              {/* HOD Selection (Mandatory on Creation) */}
              {!editingDept && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Select Department HOD * <span className="text-rose-500 font-bold">(Mandatory)</span>
                    </label>
                  </div>

                  {loadingHODs ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      Loading available HOD accounts...
                    </div>
                  ) : availableHODs.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5">
                      <div className="flex items-start gap-2">
                        <FiAlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            No available HOD found. Please create an HOD account first.
                          </p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Every active department must have exactly one active HOD assigned. Only users with role HOD who are not managing another department appear here.
                          </p>
                        </div>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleNavigateToCreateHOD}
                          className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span>+ Create HOD Account in User Management</span>
                          <FiArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        required
                        value={formData.hodId}
                        onChange={(e) => setFormData({ ...formData, hodId: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 bg-white"
                      >
                        <option value="">-- Choose an Available HOD * --</option>
                        {availableHODs.map(h => (
                          <option key={h._id} value={h._id}>
                            {h.name} ({h.email}) • {h.phoneNumber || 'Active HOD'}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        Shows only active users with role HOD who are not already managing another active department.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile / Contact Number (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  maxLength={15}
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: formatPhoneInput(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Academic division focus and objectives..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={modalLoading || (!editingDept && availableHODs.length === 0)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition shadow-md shadow-orange-500/20 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {modalLoading ? 'Saving Department...' : (editingDept ? 'Update Department' : 'Save Department')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change HOD Modal */}
      {showHODModal && selectedDeptForHOD && (
        <div 
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHODModal(false); }}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <FiUserCheck className="w-5 h-5 text-orange-500" />
                <span>Change Department HOD</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHODModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Department: <span className="font-bold text-slate-800">{selectedDeptForHOD.name} ({selectedDeptForHOD.code})</span>
            </p>

            {/* Current HOD display */}
            <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Current HOD:</span>
              {selectedDeptForHOD.hod || selectedDeptForHOD.hodId ? (
                <div className="font-bold text-slate-800 text-sm">
                  {(selectedDeptForHOD.hod || selectedDeptForHOD.hodId).name} ({(selectedDeptForHOD.hod || selectedDeptForHOD.hodId).email})
                </div>
              ) : (
                <span className="text-xs text-amber-600 font-bold">No HOD assigned</span>
              )}
            </div>

            {!hodConfirmStep ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Select New HOD *
                  </label>
                  {changeHodOptions.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No other eligible active HODs found. Please create an HOD account first.
                    </div>
                  ) : (
                    <select
                      value={selectedHodId}
                      onChange={(e) => setSelectedHodId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 bg-white"
                    >
                      <option value="">-- Choose New HOD --</option>
                      {changeHodOptions.map(h => (
                        <option key={h._id} value={h._id}>
                          {h.name} ({h.email}) • {h.phoneNumber || 'Eligible HOD'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={handleSaveHOD}
                    disabled={!selectedHodId || modalLoading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition shadow-md shadow-orange-500/20 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    Proceed to Confirm
                  </button>
                  <button
                    onClick={() => setShowHODModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation warning step */
              <div className="space-y-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <h4 className="font-extrabold text-amber-900 text-sm flex items-center gap-1.5">
                  <FiAlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Confirm HOD Reassignment</span>
                </h4>
                <div className="text-xs text-slate-700 space-y-1.5">
                  <p>
                    <strong>Current HOD:</strong> {(selectedDeptForHOD.hod || selectedDeptForHOD.hodId)?.name || 'None'}
                  </p>
                  <p>
                    <strong>New Appointed HOD:</strong> {changeHodOptions.find(h => h._id === selectedHodId)?.name}
                  </p>
                  <p className="text-slate-500 text-[11px] pt-1">
                    The previous HOD account and historical records are fully preserved. They will remain an active HOD in the system.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={handleSaveHOD}
                    disabled={modalLoading}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-xl font-bold hover:bg-orange-700 transition text-xs shadow-sm cursor-pointer"
                  >
                    {modalLoading ? 'Updating HOD...' : 'Yes, Confirm Change'}
                  </button>
                  <button
                    onClick={() => setHodConfirmStep(false)}
                    className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-xl font-bold hover:bg-slate-300 transition text-xs cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activate / Deactivate Confirmation Modal */}
      {statusConfirmDept && (
        <div 
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setStatusConfirmDept(null); }}
        >
          <div 
            className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl relative border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FiPower className={`w-5 h-5 ${statusConfirmDept.status === 'active' ? 'text-rose-500' : 'text-emerald-500'}`} />
                <span>{statusConfirmDept.status === 'active' ? 'Deactivate Department' : 'Activate Department'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setStatusConfirmDept(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Are you sure you want to {statusConfirmDept.status === 'active' ? 'deactivate' : 'activate'} <strong className="text-slate-900">{statusConfirmDept.name}</strong>?
            </p>
            {statusConfirmDept.status === 'active' ? (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl mb-4">
                ℹ️ All historical leave and task records are permanently preserved. Users and data will not be deleted.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl mb-4">
                ℹ️ The department requires an active assigned HOD to become operational.
              </p>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={handleToggleStatus}
                className={`flex-1 py-2.5 rounded-xl font-bold text-white transition text-xs cursor-pointer shadow-sm ${
                  statusConfirmDept.status === 'active' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Yes, {statusConfirmDept.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => setStatusConfirmDept(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Details Modal */}
      {viewDetailsDept && (
        <div 
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setViewDetailsDept(null); }}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-3xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900">{viewDetailsDept.name}</h3>
                  <span className="text-xs bg-orange-100 text-orange-800 font-extrabold px-2.5 py-0.5 rounded-lg border border-orange-200">
                    {viewDetailsDept.code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    viewDetailsDept.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {viewDetailsDept.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{viewDetailsDept.description || 'No description provided.'}</p>
                {viewDetailsDept.createdAt && (
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" /> Created on {new Date(viewDetailsDept.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setViewDetailsDept(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions inside Details Modal */}
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => {
                  const target = viewDetailsDept;
                  setViewDetailsDept(null);
                  handleOpenEditModal(target);
                }}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiEdit3 className="w-3.5 h-3.5" /> Edit Department
              </button>
              <button
                onClick={() => {
                  const target = viewDetailsDept;
                  setViewDetailsDept(null);
                  handleOpenHODModal(target);
                }}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiUserCheck className="w-3.5 h-3.5" /> Change HOD
              </button>
            </div>

            {detailsLoading ? (
              <Loader message="Loading Department Details..." inline />
            ) : (
              <div className="space-y-6">
                {/* HOD Card */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider block">Head of Department (HOD)</span>
                    {deptDetailsData?.department?.hod || deptDetailsData?.hod || viewDetailsDept.hod ? (
                      <div className="mt-1">
                        <span className="text-base font-extrabold text-slate-900 block">
                          {(deptDetailsData?.department?.hod || deptDetailsData?.hod || viewDetailsDept.hod).name}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                          <span className="flex items-center gap-1">
                            <FiMail className="w-3.5 h-3.5 text-orange-500" />
                            {(deptDetailsData?.department?.hod || deptDetailsData?.hod || viewDetailsDept.hod).email}
                          </span>
                          {(deptDetailsData?.department?.hod || deptDetailsData?.hod || viewDetailsDept.hod).phoneNumber && (
                            <span className="flex items-center gap-1">
                              <FiPhone className="w-3.5 h-3.5 text-orange-500" />
                              {(deptDetailsData?.department?.hod || deptDetailsData?.hod || viewDetailsDept.hod).phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 block mt-1">⚠️ No HOD currently assigned</span>
                    )}
                  </div>
                  <div className="p-3 bg-white/80 rounded-2xl border border-orange-200/60 shadow-xs">
                    <FiUserCheck className="w-6 h-6 text-orange-600" />
                  </div>
                </div>

                {/* Tabs for Stats and Faculty List */}
                <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
                  <button
                    onClick={() => setDetailsTab('overview')}
                    className={`pb-2 border-b-2 transition ${
                      detailsTab === 'overview' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Overview & Metrics
                  </button>
                  <button
                    onClick={() => setDetailsTab('faculty')}
                    className={`pb-2 border-b-2 transition ${
                      detailsTab === 'faculty' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Allocated Faculty ({deptDetailsData?.faculty?.length || 0})
                  </button>
                </div>

                {detailsTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Faculty</span>
                        <span className="text-xl font-extrabold text-slate-900">{deptDetailsData?.faculty?.length || 0}</span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 text-center">
                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Total Tasks</span>
                        <span className="text-xl font-extrabold text-blue-700">{deptDetailsData?.stats?.totalTasks || 0}</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-center">
                        <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Completed</span>
                        <span className="text-xl font-extrabold text-emerald-700">{deptDetailsData?.stats?.completed || 0}</span>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-center">
                        <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Pending</span>
                        <span className="text-xl font-extrabold text-amber-700">{deptDetailsData?.stats?.pending || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {detailsTab === 'faculty' && (
                  <div className="space-y-3">
                    {deptDetailsData?.faculty?.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <FiUsers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">No faculty members currently allocated to this department.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-extrabold text-[10px]">
                              <th className="py-2.5 px-3">Faculty Name</th>
                              <th className="py-2.5 px-3">Email</th>
                              <th className="py-2.5 px-3 text-center">Tasks</th>
                              <th className="py-2.5 px-3 text-center">Completed</th>
                              <th className="py-2.5 px-3 text-center">Pending</th>
                              <th className="py-2.5 px-3 text-center">Overdue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {deptDetailsData?.faculty?.map((fac) => (
                              <tr key={fac._id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                  {fac.name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">{fac.email}</td>
                                <td className="py-2.5 px-3 text-center font-bold">{fac.totalTasks || 0}</td>
                                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{fac.completedTasks || 0}</td>
                                <td className="py-2.5 px-3 text-center text-amber-600 font-bold">{fac.pendingTasks || 0}</td>
                                <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{fac.overdueTasks || 0}</td>
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
