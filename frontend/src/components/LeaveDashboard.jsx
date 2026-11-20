import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import { notifyDataRefresh } from '../utils/eventBus.js';
import FacultyProfileModal from './FacultyProfileModal.jsx';
import Modal from './Modal.jsx';
import Loader from './Loader.jsx';
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
  FiPhone,
  FiVolume2,
  FiSend,
  FiTrash2,
  FiTrendingUp,
  FiActivity,
  FiChevronRight
} from 'react-icons/fi';

const LeaveDashboard = ({ onSelectDepartment, onOpenFacultyProfile }) => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedFacultyProfile, setSelectedFacultyProfile] = useState(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedDeptDetailModal, setSelectedDeptDetailModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [holidays, setHolidays] = useState([]);
  const [showAnnounceHolidayModal, setShowAnnounceHolidayModal] = useState(false);
  const [holidayFormData, setHolidayFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [announcing, setAnnouncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const calculateTotalDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 3600 * 24)) + 1;
  };

  useEffect(() => {
    fetchLeaveData();

    const handleRefresh = (e) => {
      const type = e.detail?.type;
      if (type === 'leaves' || type === 'all') {
        fetchLeaveData();
      }
    };
    window.addEventListener('app_data_refresh', handleRefresh);
    return () => window.removeEventListener('app_data_refresh', handleRefresh);
  }, []);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        leaveAPI.getLeaves(),
        leaveAPI.getLeaveStats(),
        leaveAPI.getDailyAttendance(),
        leaveAPI.getHolidays()
      ]);

      if (results[0].status === 'fulfilled') setLeaves(results[0].value?.data || []);
      if (results[1].status === 'fulfilled') setStats(results[1].value?.data || null);
      if (results[2].status === 'fulfilled') setAttendanceData(results[2].value?.data || []);
      if (results[3].status === 'fulfilled') setHolidays(results[3].value?.data || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnounceHolidaySubmit = async (e) => {
    e.preventDefault();
    if (!holidayFormData.title || !holidayFormData.startDate || !holidayFormData.endDate) {
      toast.error('Title, Start Date, and End Date are required');
      return;
    }
    setAnnouncing(true);
    try {
      const res = await leaveAPI.announceHoliday(holidayFormData);
      toast.success(res.data.message || 'Holiday announced & WhatsApp messages broadcasted!');
      setShowAnnounceHolidayModal(false);
      setHolidayFormData({ title: '', startDate: '', endDate: '', description: '' });
      fetchLeaveData();
      notifyDataRefresh('leaves');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to announce holiday');
    } finally {
      setAnnouncing(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announced holiday?')) return;
    try {
      await leaveAPI.deleteHoliday(id);
      toast.success('Holiday deleted successfully');
      fetchLeaveData();
      notifyDataRefresh('leaves');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be earlier than start date');
      return;
    }

    setSubmitting(true);
    try {
      await leaveAPI.applyLeave(formData);
      toast.success('Leave application submitted successfully!');
      setShowApplyModal(false);
      setFormData({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      fetchLeaveData();
      notifyDataRefresh('leaves');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply for leave');
    } finally {
      setSubmitting(false);
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
      notifyDataRefresh('leaves');
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
      notifyDataRefresh('leaves');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel leave');
    }
  };

  const canReviewLeave = (leave) => {
    if (!leave || leave.status !== 'pending') return false;
    if (user?.role === 'admin') return true;
    if (user?.role === 'hod') {
      const applicantId = leave.applicant?._id || leave.applicant;
      const applicantEmail = leave.applicant?.email;
      const isSelfLeave = (applicantId && applicantId === user?._id) || (applicantEmail && applicantEmail === user?.email);
      const isDeptMatch = leave.department === user?.department || leave.applicant?.department === user?.department;
      return isDeptMatch && !isSelfLeave;
    }
    return false;
  };

  const isAdmin = user?.role === 'admin';
  const isHOD = user?.role === 'hod';
  const isFaculty = user?.role === 'user';
  const userDept = user?.department;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const filteredLeaves = leaves.filter(leave => {
    const endDate = new Date(leave.endDate);
    if (endDate < startOfToday) return false;

    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    const matchesDept = selectedDeptFilter === 'all' || leave.department === selectedDeptFilter || leave.applicant?.department === selectedDeptFilter;
    const applicantName = leave.applicant?.name || '';
    const dept = leave.department || '';
    const matchesSearch = applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          leave.reason.toLowerCase().includes(searchQuery.toLowerCase());

    if (isAdmin) {
      return matchesStatus && matchesDept && matchesSearch;
    }

    const leaveDept = leave.department || leave.applicant?.department;
    const isSameDept = userDept && leaveDept && leaveDept.toLowerCase() === userDept.toLowerCase();

    if (isFaculty) {
      const isMyLeave = (leave.applicant?._id && String(leave.applicant._id) === String(user?._id)) || 
                        (leave.applicant === user?._id) || 
                        (leave.applicant?.email && leave.applicant.email.toLowerCase() === user?.email?.toLowerCase());
      return matchesStatus && matchesSearch && (isMyLeave || isSameDept);
    }

    if (isHOD) {
      return matchesStatus && matchesSearch && isSameDept;
    }

    return matchesStatus && matchesSearch && isSameDept;
  });

  const displayAttendanceData = isAdmin 
    ? attendanceData 
    : (userDept ? attendanceData.filter(d => d.department.toLowerCase() === userDept.toLowerCase()) : attendanceData);

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
      case 'pending': return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-amber-200"><FiClock className="w-3.5 h-3.5" /> Pending</span>;
      case 'approved': return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-emerald-200"><FiCheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'rejected': return <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full flex items-center gap-1.5 border border-rose-200"><FiXCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full flex items-center gap-1.5 border border-slate-200">Cancelled</span>;
      default: return null;
    }
  };

  const getDepartmentOnLeaveList = (dept, deptLeaves) => {
    const map = new Map();

    if (dept.absentList && dept.absentList.length > 0) {
      dept.absentList.forEach(a => {
        const key = a._id || a.email || a.name;
        map.set(key, {
          name: a.name,
          email: a.email,
          leaveType: a.activeLeaveToday?.leaveType || 'casual',
          status: 'approved',
          reason: a.activeLeaveToday?.reason || ''
        });
      });
    }

    deptLeaves.forEach(l => {
      if (l.status === 'approved' || l.status === 'pending') {
        const endDate = new Date(l.endDate);
        if (endDate >= startOfToday) {
          const name = l.applicant?.name || 'Faculty';
          const key = l.applicant?._id || l.applicant?.email || name;
          if (!map.has(key)) {
            map.set(key, {
              name,
              email: l.applicant?.email,
              leaveType: l.leaveType,
              status: l.status,
              reason: l.reason
            });
          }
        }
      }
    });

    return Array.from(map.values());
  };

  if (loading) {
    return <Loader message="Loading Leave Management..." inline />;
  }

  const totalPresentToday = attendanceData.reduce((acc, d) => acc + (d.presentCount || 0), 0);
  const totalAbsentToday = attendanceData.reduce((acc, d) => acc + (d.absentCount || 0), 0);

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* 1. Modern Header Banner (Warm & High-Signal) */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-500/15 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-1">
            <FiCalendar className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Directorate Administration' : isHOD ? `${userDept} Directorate` : `${userDept || 'Faculty'} Portal`}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Leave & Attendance Management
          </h2>
          <p className="text-xs sm:text-sm text-orange-100 font-medium">
            Track leave applications, daily faculty attendance, and official announcements.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 self-start md:self-auto">
          {isAdmin && (
            <button
              onClick={() => setShowAnnounceHolidayModal(true)}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-2xl font-bold transition flex items-center justify-center gap-2 text-xs md:text-sm active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <FiVolume2 className="w-4 h-4" />
              <span>+ Announce Holiday</span>
            </button>
          )}

          <button
            onClick={() => setShowApplyModal(true)}
            className="px-5 py-2.5 bg-white text-orange-600 hover:bg-orange-50 rounded-2xl font-bold transition shadow-md flex items-center justify-center gap-2 text-xs md:text-sm active:scale-95 cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics & Quotas Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requests / Casual Leave */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isFaculty ? 'Casual Leave (CL)' : 'Total Applications'}
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FiCalendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            {isFaculty ? `${stats?.leaveBalance?.casual ?? 12} Days` : (stats?.totalLeaves || 0)}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {isFaculty ? 'Available quota balance' : 'Total submitted applications'}
          </p>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <FiClock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {stats?.pendingLeaves || 0}
          </p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            {stats?.pendingLeaves > 0 ? (
              <span className="text-amber-600 font-bold">Awaiting decision</span>
            ) : (
              'All applications reviewed'
            )}
          </p>
        </div>

        {/* Card 3: Approved Leaves */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {stats?.approvedLeaves || 0}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Granted leave applications
          </p>
        </div>

        {/* Card 4: Sick Leave / Rejected */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isFaculty ? 'Sick Leave (SL)' : 'Rejected'}
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <FiActivity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            {isFaculty ? `${stats?.leaveBalance?.sick ?? 10} Days` : (stats?.rejectedLeaves || 0)}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {isFaculty ? 'Available quota balance' : 'Declined applications'}
          </p>
        </div>
      </div>

      {/* 3. Announced Holidays Section (If any exist) */}
      {holidays.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-200/80 shadow-sm bg-gradient-to-r from-purple-50/40 via-white to-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <FiVolume2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Announced College Holidays
                </h3>
                <p className="text-xs text-slate-500">Official management notices broadcasted to faculty</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full w-fit">
              {holidays.length} Holiday{holidays.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {holidays.map((h) => (
              <div key={h._id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2 relative group hover:bg-white hover:shadow-sm transition">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteHoliday(h._id)}
                    className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Holiday"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="pr-6">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{h.title}</h4>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[11px] font-bold border border-purple-200">
                    {new Date(h.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(h.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({h.totalDays} Days)
                  </span>
                </div>
                {h.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{h.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Department Attendance & Faculty Leave Summary */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiBriefcase className="w-5 h-5 text-orange-500" />
              <span>Department Attendance & Daily Leave Summary</span>
            </h3>
            <p className="text-xs text-slate-500">
              Overview of total faculties, present count, and active leave members per department
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              🟢 {totalPresentToday} Present
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
              🔴 {totalAbsentToday} On Leave
            </span>
            {selectedDeptFilter !== 'all' && (
              <button 
                onClick={() => setSelectedDeptFilter('all')}
                className="px-2.5 py-1 bg-orange-100 text-orange-700 font-bold text-xs rounded-xl hover:bg-orange-200 transition"
              >
                Clear Filter ✕
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAttendanceData.map((dept) => {
            const deptLeaves = leaves.filter(l => l.department === dept.department || l.applicant?.department === dept.department);
            const isSelected = selectedDeptFilter === dept.department;
            const onLeaveList = getDepartmentOnLeaveList(dept, deptLeaves);

            return (
              <div
                key={dept.department}
                onClick={() => onSelectDepartment ? onSelectDepartment(dept.department) : setSelectedDeptDetailModal(dept)}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 bg-slate-50/40 hover:bg-white hover:shadow-md ${
                  isSelected ? 'border-orange-500 ring-2 ring-orange-400/20' : 'border-slate-200/80 hover:border-orange-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-xl font-extrabold text-xs flex items-center justify-center shadow-xs">
                        {dept.department.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm truncate">{dept.department}</h4>
                        <p className="text-[11px] font-medium text-slate-400">{dept.totalFaculty} Total Staff</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-orange-600 hover:underline">
                      Details →
                    </span>
                  </div>

                  {/* 3 Quick Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center my-2">
                    <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Leaves</span>
                      <span className="text-sm font-extrabold text-slate-800">{deptLeaves.length}</span>
                    </div>
                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present</span>
                      <span className="text-sm font-extrabold text-emerald-700">{dept.presentCount}</span>
                    </div>
                    <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                      <span className="text-[10px] font-bold text-rose-700 uppercase block">On Leave</span>
                      <span className="text-sm font-extrabold text-rose-700">{dept.absentCount}</span>
                    </div>
                  </div>
                </div>

                {/* On-Leave Faculty Members List */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span className="text-[11px] font-bold text-slate-500">
                      Faculties on Leave:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      onLeaveList.length > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {onLeaveList.length} Member{onLeaveList.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {onLeaveList.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                      {onLeaveList.map((f, idx) => (
                        <div 
                          key={idx} 
                          className="p-1.5 px-2 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                            <span className="font-bold text-slate-800 truncate">{f.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-rose-700 bg-white px-1.5 py-0.5 rounded border border-rose-200 flex-shrink-0">
                            {f.leaveType}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-medium bg-emerald-50/50 p-1.5 rounded-xl text-center">
                      ✓ All faculties present today
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Main Leave Records Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiFileText className="w-5 h-5 text-orange-500" />
              <span>Leave Application Records</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'All departmental leave applications' : isHOD ? `Department faculty leave requests (${userDept})` : 'My leave application history'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'all' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'pending' ? 'bg-white text-amber-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'rejected' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Rejected
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leaves..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          {filteredLeaves.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FiCalendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Leave Applications Found</p>
              <p className="text-xs text-slate-400 mt-0.5">No records matching the selected filter or search query.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Applicant</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Dates</th>
                  <th className="p-3.5">Days</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/80 transition">
                    <td 
                      className="p-3.5 cursor-pointer group"
                      onClick={() => onOpenFacultyProfile ? onOpenFacultyProfile(leave.applicant) : setSelectedFacultyProfile(leave.applicant)}
                      title="View Faculty Profile"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-xs shadow-xs group-hover:scale-105 transition">
                          {leave.applicant?.name?.charAt(0).toUpperCase() || 'F'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight group-hover:text-orange-600 transition">{leave.applicant?.name || 'Faculty Member'}</p>
                          <p className="text-[11px] text-slate-400">{leave.department || leave.applicant?.department}</p>
                          {leave.applicant?.phoneNumber && (
                            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                              <FiPhone className="w-2.5 h-2.5 text-emerald-500" />
                              <span>{leave.applicant.phoneNumber}</span>
                            </p>
                          )}
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
                        {canReviewLeave(leave) && (
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

                        {((leave.applicant?._id === user?._id) || (leave.applicant === user?._id) || (leave.applicant?.email === user?.email)) && (leave.status === 'pending' || leave.status === 'approved') && (
                          <button
                            onClick={() => handleCancelLeave(leave._id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                            title="Cancel your leave application"
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

      {/* APPLY LEAVE MODAL */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)}>
        {showApplyModal && (
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 fade-in">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-orange-500" />
                  <span>Submit Leave Application</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Submit request for HOD & Admin review</p>
              </div>
              <button 
                onClick={() => setShowApplyModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Leave Category *
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="casual">Casual Leave (CL) — Routine Personal Matters</option>
                  <option value="sick">Sick Leave (SL) — Medical Recuperation</option>
                  <option value="earned">Earned Leave (EL) — Accumulated Quota</option>
                  <option value="duty">On Duty (OD) — Official Conference / Duty</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-xs font-semibold text-slate-800 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-xs font-semibold text-slate-800 bg-white"
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-orange-900">
                  <span className="flex items-center gap-1.5"><FiClock className="w-4 h-4 text-orange-500" /> Total Duration:</span>
                  <span className="px-2.5 py-0.5 bg-orange-500 text-white rounded-lg text-xs font-bold">
                    {calculateTotalDays(formData.startDate, formData.endDate)} {calculateTotalDays(formData.startDate, formData.endDate) > 1 ? 'Days' : 'Day'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Absence *
                </label>
                <textarea
                  rows="3"
                  placeholder="State reason and alternative teaching arrangements..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-xs font-medium text-slate-800 resize-none bg-white"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-2.5 rounded-xl font-bold transition shadow-md text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  disabled={submitting}
                  className="px-4 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* DEPARTMENT DETAIL MODAL */}
      <Modal isOpen={!!selectedDeptDetailModal} onClose={() => setSelectedDeptDetailModal(null)}>
        {selectedDeptDetailModal && (
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FiBriefcase className="text-orange-500 w-5 h-5" />
                  <span>{selectedDeptDetailModal.department} Department Details</span>
                </h3>
                <p className="text-xs text-slate-500">Attendance breakdown and leave applications</p>
              </div>
              <button
                onClick={() => setSelectedDeptDetailModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Staff</span>
                <span className="text-base font-extrabold text-slate-800">{selectedDeptDetailModal.totalFaculty}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Present</span>
                <span className="text-base font-extrabold text-emerald-700">{selectedDeptDetailModal.presentCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">On Leave</span>
                <span className="text-base font-extrabold text-rose-700">{selectedDeptDetailModal.absentCount}</span>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-orange-600 uppercase block">Requests</span>
                <span className="text-base font-extrabold text-orange-700">{selectedDeptDetailModal.leaveRequests?.length || 0}</span>
              </div>
            </div>

            {/* Present Faculties List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FiCheckCircle className="text-emerald-500 w-3.5 h-3.5" />
                <span>Present Faculties Today ({selectedDeptDetailModal.presentCount})</span>
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedDeptDetailModal.presentList && selectedDeptDetailModal.presentList.length > 0 ? (
                  selectedDeptDetailModal.presentList.map((faculty) => (
                    <div key={faculty._id} className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-2 px-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                          {faculty.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800">{faculty.name}</span>
                      </div>
                      <span className="text-emerald-700 font-semibold text-[11px]">Present</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No faculty present today.</p>
                )}
              </div>
            </div>

            {/* On Leave Faculties List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FiXCircle className="text-rose-500 w-3.5 h-3.5" />
                <span>On Leave Faculties Today ({selectedDeptDetailModal.absentCount})</span>
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedDeptDetailModal.absentList && selectedDeptDetailModal.absentList.length > 0 ? (
                  selectedDeptDetailModal.absentList.map((faculty) => (
                    <div key={faculty._id} className="bg-rose-50/40 border border-rose-100 rounded-xl p-2 px-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">
                          {faculty.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800">{faculty.name}</span>
                          {faculty.activeLeaveToday?.reason && (
                            <p className="text-[10px] text-slate-500 italic truncate max-w-xs">{faculty.activeLeaveToday.reason}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-rose-700 font-semibold text-[11px] bg-white px-2 py-0.5 rounded border border-rose-200">
                        {faculty.activeLeaveToday?.leaveType || 'Absent'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-600 font-medium bg-emerald-50/50 p-2 rounded-xl text-center">
                    Full Attendance! No faculty members on leave today.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedDeptDetailModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FACULTY PROFILE MODAL */}
      {selectedFacultyProfile && (
        <FacultyProfileModal
          faculty={selectedFacultyProfile}
          onClose={() => setSelectedFacultyProfile(null)}
          onRefresh={fetchLeaveData}
        />
      )}

      {/* REVIEW ACTION MODAL */}
      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)}>
        {reviewModal && (
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 text-center fade-in space-y-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto ${
              reviewModal.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {reviewModal.action === 'approved' ? <FiCheck className="w-6 h-6" /> : <FiX className="w-6 h-6" />}
            </div>

            <h3 className="text-base font-bold text-slate-800 capitalize">
              {reviewModal.action} Leave Request
            </h3>
            <p className="text-xs text-slate-500">
              Applicant: <strong className="text-slate-800">{reviewModal.leave?.applicant?.name || 'Faculty'}</strong> ({reviewModal.leave?.totalDays} Days)
            </p>

            <textarea
              rows="2"
              placeholder="Add optional review comment..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400 bg-white"
            />

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleReviewAction}
                className={`flex-1 text-white py-2 rounded-xl font-bold text-xs shadow-sm transition ${
                  reviewModal.action === 'approved' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-semibold hover:bg-slate-200 transition text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ANNOUNCE HOLIDAY MODAL */}
      <Modal isOpen={showAnnounceHolidayModal} onClose={() => setShowAnnounceHolidayModal(false)}>
        {showAnnounceHolidayModal && (
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <FiVolume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Announce Official Holiday</h3>
                  <p className="text-xs text-slate-500">WhatsApp notification will be broadcasted to all faculty</p>
                </div>
              </div>
              <button onClick={() => setShowAnnounceHolidayModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAnnounceHolidaySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Holiday / Occasion Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Festival Break, Summer Vacation"
                  value={holidayFormData.title}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={holidayFormData.startDate}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    min={holidayFormData.startDate}
                    value={holidayFormData.endDate}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice / Description (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. All classes will remain suspended. College reopens on Monday."
                  value={holidayFormData.description}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 resize-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-xs text-purple-900 font-medium flex items-start gap-2">
                <FiSend className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>WhatsApp Broadcast:</strong> Official notice will automatically be sent to all registered faculty members' WhatsApp numbers.
                </span>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={announcing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2.5 rounded-xl font-bold transition shadow-md text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {announcing ? 'Broadcasting...' : 'Announce & Broadcast'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnounceHolidayModal(false)}
                  disabled={announcing}
                  className="px-4 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition text-xs"
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

export default LeaveDashboard;
