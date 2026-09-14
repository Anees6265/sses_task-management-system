import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import { 
  FiCalendar, 
  FiPlus, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle, 
  FiUser, 
  FiBriefcase, 
  FiFileText, 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCheck, 
  FiMessageSquare,
  FiActivity
} from 'react-icons/fi';

const LeaveDashboard = ({ onSelectDepartment }) => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedDeptDetailModal, setSelectedDeptDetailModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [leavesRes, statsRes, attendanceRes] = await Promise.all([
        leaveAPI.getLeaves(),
        leaveAPI.getLeaveStats(),
        leaveAPI.getDailyAttendance()
      ]);
      setLeaves(leavesRes.data || []);
      setStats(statsRes.data || null);
      setAttendanceData(attendanceRes.data || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await leaveAPI.applyLeave(formData);
      toast.success('Leave application submitted successfully!');
      setShowApplyModal(false);
      setFormData({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      fetchLeaveData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply for leave');
    }
  };

  const handleReviewAction = async () => {
    if (!reviewModal) return;
    try {
      await leaveAPI.updateLeaveStatus(reviewModal.leave._id, {
        status: reviewModal.action,
        reviewComment: reviewComment.trim()
      });
      toast.success(`Leave request ${reviewModal.action} successfully!`);
      setReviewModal(null);
      setReviewComment('');
      fetchLeaveData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    }
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await leaveAPI.cancelLeave(id);
      toast.success('Leave cancelled');
      fetchLeaveData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel leave');
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    const matchesDept = selectedDeptFilter === 'all' || leave.department === selectedDeptFilter || leave.applicant?.department === selectedDeptFilter;
    const applicantName = leave.applicant?.name || '';
    const dept = leave.department || '';
    const matchesSearch = applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const getLeaveTypeBadge = (type) => {
    switch (type) {
      case 'casual': return <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">Casual Leave (CL)</span>;
      case 'sick': return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200">Sick Leave (SL)</span>;
      case 'earned': return <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">Earned Leave (EL)</span>;
      case 'duty': return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">On Duty (OD)</span>;
      default: return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">{type}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full flex items-center gap-1.5 border border-amber-300"><FiClock className="w-3.5 h-3.5" /> Pending</span>;
      case 'approved': return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full flex items-center gap-1.5 border border-emerald-300"><FiCheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'rejected': return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full flex items-center gap-1.5 border border-rose-300"><FiXCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full flex items-center gap-1.5 border border-slate-300">Cancelled</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold text-sm">Loading Leave Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiCalendar className="w-3.5 h-3.5" />
              {user?.role === 'admin' ? 'Institution Portal' : user?.role === 'hod' ? `${user?.department} HOD Portal` : 'Faculty Portal'}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <span>Leave Management Dashboard</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">Apply for leave, track department leave counts & manage team leave approvals</p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-bold transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-xs md:text-sm relative z-10 active:scale-95"
        >
          <FiPlus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Metrics & Quotas Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total / Quota Card 1 */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FiCalendar className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">
              {user?.role === 'user' ? 'Casual Leave' : 'Requests'}
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {user?.role === 'user' ? `${stats?.leaveBalance?.casual || 12} Days` : (stats?.totalLeaves || 0)}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {user?.role === 'user' ? 'Casual Leave Quota Available' : 'Total Leave Applications'}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <FiClock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Action Needed</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">{stats?.pendingLeaves || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Pending Approval Requests</p>
        </div>

        {/* Approved Leaves */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Granted</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">{stats?.approvedLeaves || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Approved Applications</p>
        </div>

        {/* Sick / Earned Quota */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <FiActivity className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">
              {user?.role === 'user' ? 'Sick Leave' : 'Rejected'}
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {user?.role === 'user' ? `${stats?.leaveBalance?.sick || 10} Days` : (stats?.rejectedLeaves || 0)}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {user?.role === 'user' ? 'Sick Leave Quota Available' : 'Rejected Applications'}
          </p>
        </div>
      </div>

      {/* DEPARTMENT-WISE LEAVE & TOTAL FACULTY CARDS */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
              <FiBriefcase className="text-orange-500 w-5 h-5" />
              <span>Department-Wise Total Leaves & Faculty Summary</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Click any department card to open its dedicated department detail page
            </p>
          </div>

          {selectedDeptFilter !== 'all' && (
            <button 
              onClick={() => setSelectedDeptFilter('all')}
              className="px-3.5 py-1.5 bg-orange-100 text-orange-700 font-extrabold text-xs rounded-xl hover:bg-orange-200 transition"
            >
              Clear Filter ({selectedDeptFilter}) ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendanceData.map((dept) => {
            const deptLeaves = leaves.filter(l => l.department === dept.department || l.applicant?.department === dept.department);
            const isSelected = selectedDeptFilter === dept.department;

            return (
              <div
                key={dept.department}
                onClick={() => onSelectDepartment ? onSelectDepartment(dept.department) : setSelectedDeptDetailModal(dept)}
                className={`glass-card glass-card-hover rounded-2xl p-5 border cursor-pointer transition-all ${
                  isSelected ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-400/20' : 'border-slate-200/80 hover:border-orange-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20">
                      {dept.department.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{dept.department}</h4>
                      <p className="text-[11px] font-semibold text-slate-400">{dept.totalFaculty} Total Faculties</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-orange-500 text-white shadow-xs">
                    View Details ➔
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center my-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Leaves</span>
                    <span className="text-base font-extrabold text-slate-800">{deptLeaves.length}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">Present Today</span>
                    <span className="text-base font-extrabold text-emerald-700">{dept.presentCount}</span>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-extrabold text-rose-600 uppercase block">On Leave Today</span>
                    <span className="text-base font-extrabold text-rose-700">{dept.absentCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Leave Records Table */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <FiFileText className="w-5 h-5 text-orange-500" />
              <span>Leave Application Records</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {user?.role === 'admin' ? 'All department leave applications' : user?.role === 'hod' ? `Department faculty leave requests (${user?.department})` : 'My leave history'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto text-xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'all' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'pending' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'rejected' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'}`}
              >
                Rejected
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>

        {/* Table / Cards View */}
        <div className="overflow-x-auto">
          {filteredLeaves.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FiCalendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Leave Applications Found</p>
              <p className="text-xs text-slate-400 mt-1">There are no leave records matching the selected status filter.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Applicant</th>
                  <th className="p-3.5">Leave Type</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Days</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-xs">
                          {leave.applicant?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{leave.applicant?.name || 'N/A'}</p>
                          <p className="text-[11px] text-slate-400">{leave.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">{getLeaveTypeBadge(leave.leaveType)}</td>
                    <td className="p-3.5 text-xs font-semibold text-slate-600">
                      {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{leave.totalDays} {leave.totalDays > 1 ? 'Days' : 'Day'}</td>
                    <td className="p-3.5 max-w-xs truncate text-slate-600" title={leave.reason}>{leave.reason}</td>
                    <td className="p-3.5">{getStatusBadge(leave.status)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* HOD/Admin Actions for Pending Leaves */}
                        {(user?.role === 'admin' || (user?.role === 'hod' && leave.department === user?.department)) && leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setReviewModal({ leave, action: 'approved' })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <FiCheck className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => setReviewModal({ leave, action: 'rejected' })}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <FiX className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {/* Faculty Cancel pending leave */}
                        {leave.applicant?._id === user?._id && leave.status === 'pending' && (
                          <button
                            onClick={() => handleCancelLeave(leave._id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                        )}

                        {leave.reviewComment && (
                          <span className="text-[11px] text-slate-400 italic" title={leave.reviewComment}>
                            "{leave.reviewComment}"
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 fade-in">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-orange-500" />
                <span>Apply for Leave</span>
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Leave Type *
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800"
                >
                  <option value="casual">Casual Leave (CL)</option>
                  <option value="sick">Sick Leave (SL)</option>
                  <option value="earned">Earned Leave (EL)</option>
                  <option value="duty">On Duty (OD)</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-xs font-medium text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-xs font-medium text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Reason for Leave *
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide details or reason for taking leave..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-medium text-slate-800 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-xl font-bold transition shadow-md shadow-orange-500/20 text-sm"
                >
                  Submit Application
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DEPARTMENT DETAIL MODAL */}
      {selectedDeptDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto fade-in space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <FiBriefcase className="text-orange-500 w-6 h-6" />
                  <span>{selectedDeptDetailModal.department} Department Details & Leaves</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Complete view of present faculties, on leave faculties, and all leave applications
                </p>
              </div>
              <button
                onClick={() => setSelectedDeptDetailModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Department Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Faculties</span>
                <span className="text-xl font-extrabold text-slate-800">{selectedDeptDetailModal.totalFaculty}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Present Today</span>
                <span className="text-xl font-extrabold text-emerald-700">{selectedDeptDetailModal.presentCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-rose-600 block">On Leave Today</span>
                <span className="text-xl font-extrabold text-rose-700">{selectedDeptDetailModal.absentCount}</span>
              </div>
              <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-extrabold uppercase text-orange-600 block">Total Requests</span>
                <span className="text-xl font-extrabold text-orange-700">{selectedDeptDetailModal.leaveRequests?.length || 0}</span>
              </div>
            </div>

            {/* 1. Present Faculties Section */}
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                <FiCheckCircle className="text-emerald-500 w-4 h-4" />
                <span>Present Faculties Today ({selectedDeptDetailModal.presentCount})</span>
              </h4>
              <div className="space-y-2">
                {selectedDeptDetailModal.presentList && selectedDeptDetailModal.presentList.length > 0 ? (
                  selectedDeptDetailModal.presentList.map((faculty) => (
                    <div key={faculty._id} className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs">
                          {faculty.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-xs">{faculty.name}</h5>
                          <p className="text-[11px] text-slate-400">{faculty.email}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full text-[11px] flex items-center gap-1 border border-emerald-300">
                        <FiCheck className="w-3 h-3" /> Present Today
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No faculty present today.</p>
                )}
              </div>
            </div>

            {/* 2. On Leave Faculties Section */}
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                <FiXCircle className="text-rose-500 w-4 h-4" />
                <span>On Leave Faculties Today ({selectedDeptDetailModal.absentCount})</span>
              </h4>
              <div className="space-y-2">
                {selectedDeptDetailModal.absentList && selectedDeptDetailModal.absentList.length > 0 ? (
                  selectedDeptDetailModal.absentList.map((faculty) => (
                    <div key={faculty._id} className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                          {faculty.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-xs">{faculty.name}</h5>
                          <p className="text-[11px] text-slate-400">{faculty.email}</p>
                          {faculty.activeLeaveToday?.reason && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">"{faculty.activeLeaveToday.reason}"</p>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 font-extrabold rounded-full text-[11px] flex items-center gap-1 border border-rose-300">
                        <FiX className="w-3 h-3" /> On Leave ({faculty.activeLeaveToday?.leaveType || 'Absent'})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                    Full Attendance! No faculty members are on leave in this department today.
                  </p>
                )}
              </div>
            </div>

            {/* 3. Department Leave Applications */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                <FiCalendar className="text-orange-500 w-4 h-4" />
                <span>Department Leave Applications ({selectedDeptDetailModal.leaveRequests?.length || 0})</span>
              </h4>

              {selectedDeptDetailModal.leaveRequests && selectedDeptDetailModal.leaveRequests.length > 0 ? (
                <div className="space-y-3">
                  {selectedDeptDetailModal.leaveRequests.map((leave) => (
                    <div 
                      key={leave._id}
                      className="glass-card rounded-2xl p-4 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                          {leave.applicant?.name?.charAt(0).toUpperCase() || 'F'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-extrabold text-slate-800 text-xs">{leave.applicant?.name || 'Faculty Member'}</h5>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md uppercase">
                              {leave.leaveType} Leave
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{leave.applicant?.email}</p>
                          <p className="text-xs font-semibold text-slate-600 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            Reason: {leave.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border uppercase ${
                          leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          leave.status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {leave.status}
                        </span>
                        <p className="text-[11px] font-bold text-slate-500">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.totalDays} Days)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 text-center text-slate-400 border border-slate-100">
                  <p className="text-xs font-semibold">No leave applications recorded for this department.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedDeptDetailModal(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Close Department Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveDashboard;
