import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiShield,
  FiPieChart,
  FiTrendingUp,
  FiActivity,
  FiAward,
  FiX,
  FiXCircle,
  FiPlus,
  FiFileText,
  FiFilter
} from 'react-icons/fi';

const FacultyAttendanceCalendar = ({ faculty, leaves: passedLeaves, onRefresh }) => {
  const { user: currentUser } = useContext(AuthContext);

  const [facultyLeaves, setFacultyLeaves] = useState(passedLeaves || []);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = current month, -1 = last month, 1 = next month
  const [analyticsModalMonth, setAnalyticsModalMonth] = useState(null); // 'current' | 'previous' | 'next' | 'next2' | number | null

  // Leave Management State
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const facultyId = faculty?._id || (typeof faculty === 'string' ? faculty : null);
  const facultyEmail = faculty?.email || '';
  const facultyName = faculty?.name || 'Faculty Member';
  const facultyDept = faculty?.department || 'General';
  const facultyRole = faculty?.role || 'user';

  // Keep facultyLeaves in sync if passed from parent
  useEffect(() => {
    if (Array.isArray(passedLeaves) && passedLeaves.length > 0) {
      setFacultyLeaves(passedLeaves);
    }
  }, [passedLeaves]);

  // Fetch leaves if not provided by parent
  useEffect(() => {
    if ((!passedLeaves || passedLeaves.length === 0) && facultyId) {
      fetchLeaves();
    }
  }, [facultyId]);

  const fetchLeaves = async () => {
    try {
      const res = await leaveAPI.getLeaves({ includePast: 'true', userId: facultyId });
      const allLeaves = Array.isArray(res?.data) ? res.data : [];
      const userLeaves = allLeaves.filter(l => {
        if (!l) return false;
        const applicantId = String(l.applicant?._id || l.applicant || '');
        const applicantEmail = l.applicant?.email;
        return (facultyId && applicantId === String(facultyId)) ||
               (facultyEmail && applicantEmail && applicantEmail.toLowerCase() === facultyEmail.toLowerCase());
      });
      setFacultyLeaves(userLeaves);
    } catch (err) {
      console.warn('Could not fetch leaves for calendar:', err.message);
    }
  };

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAnalyticsModalMonth(null);
        setReviewModal(null);
        setShowApplyModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canReviewLeave = (leave) => {
    if (!leave || leave.status !== 'pending') return false;
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'hod') {
      const applicantId = leave.applicant?._id || leave.applicant;
      const applicantEmail = leave.applicant?.email;
      const isSelfLeave = (applicantId && applicantId === currentUser?._id) || (applicantEmail && applicantEmail === currentUser?.email);
      const isDeptMatch = leave.department === currentUser?.department || leave.applicant?.department === currentUser?.department;
      return isDeptMatch && !isSelfLeave;
    }
    return false;
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
      fetchLeaves();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    }
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await leaveAPI.cancelLeave(id);
      toast.success('Leave cancelled successfully!');
      fetchLeaves();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel leave');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (new Date(applyForm.endDate) < new Date(applyForm.startDate)) {
      toast.error('End date cannot be earlier than start date');
      return;
    }
    setSubmittingLeave(true);
    try {
      await leaveAPI.applyLeave({
        ...applyForm,
        ...(currentUser?.role === 'admin' && facultyId && facultyId !== currentUser?._id ? { applicant: facultyId } : {})
      });
      toast.success('Leave application submitted successfully!');
      setShowApplyModal(false);
      setApplyForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply for leave');
    } finally {
      setSubmittingLeave(false);
    }
  };

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
      case 'pending': return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-amber-300"><FiClock className="w-3.5 h-3.5" /> Pending</span>;
      case 'approved': return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-emerald-300"><FiCheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'rejected': return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-rose-300"><FiXCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full flex items-center gap-1 border border-slate-300">Cancelled</span>;
      default: return null;
    }
  };

  // Build Day-by-Day (1 to 30/31) Date Matrix for Selected Month (Starts on Sunday)
  const buildMonthDateMatrix = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(now.getFullYear(), now.getMonth() + selectedMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysArray = [];

    const approvedLeaves = facultyLeaves.filter(l => l && l.status === 'approved');

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);

      const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dayDate.getDay() === 0;
      const isFuture = dayDate.getTime() > today.getTime();
      const isToday = dayDate.getTime() === today.getTime();

      // Check if faculty has approved leave covering this day
      const activeLeaveOnDay = approvedLeaves.find(l => {
        if (!l.startDate) return false;
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : start;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return dayDate >= start && dayDate <= end;
      });

      daysArray.push({
        dayNumber: day,
        dateString: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dayOfWeek,
        isSunday,
        isFuture,
        isToday,
        isLeave: !!activeLeaveOnDay,
        leaveDetails: activeLeaveOnDay || null
      });
    }

    return { monthName, daysArray, totalDaysInMonth, firstDayOfWeek, year, month };
  };

  const currentMonthMatrix = buildMonthDateMatrix();

  // Calculate rich statistics for any month offset (0 = current month, -1 = last month, 1 = next month, etc.)
  const getMonthStats = (offset = 0) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const shortMonth = targetDate.toLocaleString('default', { month: 'short' });
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    let sundaysCount = 0;
    for (let day = 1; day <= totalDaysInMonth; day++) {
      if (new Date(year, month, day).getDay() === 0) {
        sundaysCount++;
      }
    }
    const workingDays = Math.max(1, totalDaysInMonth - sundaysCount);

    const approvedLeaves = facultyLeaves.filter(l => l && l.status === 'approved');
    const monthLeaves = approvedLeaves.filter(l => {
      if (!l.startDate) return false;
      const start = new Date(l.startDate);
      const end = l.endDate ? new Date(l.endDate) : start;
      return (start.getFullYear() === year && start.getMonth() === month) ||
             (end.getFullYear() === year && end.getMonth() === month);
    });

    const leavesTaken = monthLeaves.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
    const clTaken = monthLeaves.filter(l => l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
    const slTaken = monthLeaves.filter(l => l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
    const elTaken = monthLeaves.filter(l => l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
    const odTaken = monthLeaves.filter(l => l.leaveType === 'duty').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

    const daysPresent = Math.max(0, workingDays - leavesTaken);
    const attendanceRate = Math.min(100, Math.max(0, Math.round((daysPresent / workingDays) * 100)));
    const isZeroLeaves = leavesTaken === 0;

    return {
      offset,
      monthName,
      shortMonth,
      year,
      month,
      totalDaysInMonth,
      sundaysCount,
      workingDays,
      leavesTaken,
      daysPresent,
      attendanceRate,
      isZeroLeaves,
      clTaken,
      slTaken,
      elTaken,
      odTaken,
      totalQuotas: 37,
      preservedQuotas: Math.max(0, 37 - (clTaken + slTaken + elTaken)),
      monthLeaves
    };
  };

  const currentStats = getMonthStats(0);
  const lastMonthStats = getMonthStats(-1);
  const nextMonthStats = getMonthStats(1);
  const nextNextMonthStats = getMonthStats(2);

  const getModalOffset = (val) => {
    if (typeof val === 'number') return val;
    if (val === 'previous') return -1;
    if (val === 'next') return 1;
    if (val === 'next2') return 2;
    return 0; // 'current' or fallback
  };

  const modalOffset = getModalOffset(analyticsModalMonth);
  const activeModalStats = getMonthStats(modalOffset);

  const filteredLeaves = facultyLeaves.filter(leave => {
    return statusFilter === 'all' || leave.status === statusFilter;
  });

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div>
          <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
            <FiCalendar className="text-orange-500 w-5 h-5" />
            <span>Monthly Attendance Breakdown: {currentMonthMatrix.monthName}</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Complete day-by-day status from Day 1 to Day {currentMonthMatrix.totalDaysInMonth}
          </p>
        </div>

        {/* Month Selector Buttons with Prev, This, Next, and Navigation arrows */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Apply Leave Button */}
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer mr-1"
            title="Apply for Leave"
          >
            <FiPlus className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>

          <button
            onClick={() => setSelectedMonthOffset(prev => prev - 1)}
            className="p-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-xs cursor-pointer"
            title="Previous Month"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedMonthOffset(-1)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
              selectedMonthOffset === -1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Last Month</span>
          </button>

          <button
            onClick={() => setSelectedMonthOffset(0)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
              selectedMonthOffset === 0 ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>This Month</span>
          </button>

          <button
            onClick={() => setSelectedMonthOffset(1)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
              selectedMonthOffset === 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Next Month</span>
          </button>

          <button
            onClick={() => setSelectedMonthOffset(prev => prev + 1)}
            className="p-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-xs cursor-pointer"
            title="Next Month"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 inline-block shadow-xs"></span>
          Present / Active Duty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-rose-500 inline-block shadow-xs"></span>
          On Approved / Scheduled Leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-200 border border-amber-400 inline-block"></span>
          Sunday (Weekend)
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300 inline-block"></span>
          Upcoming Date (Disabled)
        </span>
      </div>

      {/* 7-COLUMN WEEKDAY HEADERS (STARTS WITH SUNDAY ON LEFT) */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-600 uppercase tracking-wider bg-slate-100/80 p-3 rounded-2xl border border-slate-200/80">
        <div className="text-rose-600 font-black">Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* 7-COLUMN CALENDAR GRID */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty padding cells for days before 1st of month */}
        {Array.from({ length: currentMonthMatrix.firstDayOfWeek }).map((_, i) => (
          <div key={`padding-${i}`} className="bg-slate-50/40 rounded-2xl p-2.5 border border-slate-100/60 opacity-30 min-h-[85px]" />
        ))}

        {/* Actual Date Cells */}
        {currentMonthMatrix.daysArray.map((day) => {
          let cardStyle = "bg-emerald-50/40 border-emerald-200 text-emerald-900";
          let statusContent = (
            <span className="text-[11px] font-extrabold text-emerald-700 flex items-center gap-1">
              <FiCheck className="w-3 h-3 text-emerald-600" /> Present
            </span>
          );

          if (day.isLeave) {
            cardStyle = "bg-rose-50 border-rose-300 text-rose-900 shadow-xs ring-1 ring-rose-300/50";
            statusContent = (
              <div>
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-black uppercase inline-block mb-1 shadow-2xs">
                  {day.isFuture ? 'Scheduled Leave' : (day.leaveDetails?.leaveType || 'Leave')}
                </span>
                <p className="text-[11px] font-bold truncate text-rose-800" title={day.leaveDetails?.reason}>
                  "{day.leaveDetails?.reason}"
                </p>
              </div>
            );
          } else if (day.isFuture) {
            // Future date without scheduled leave -> Disabled style
            cardStyle = "bg-slate-50/80 border-slate-200/70 text-slate-400 opacity-60 cursor-not-allowed";
            statusContent = (
              <span className="text-[11px] font-semibold text-slate-400 italic">
                Upcoming
              </span>
            );
          } else if (day.isSunday) {
            cardStyle = "bg-amber-50/70 border-amber-200 text-amber-900";
            statusContent = (
              <span className="text-[11px] font-bold text-amber-700 block">Sunday</span>
            );
          }

          return (
            <div
              key={day.dayNumber}
              className={`rounded-2xl p-2.5 border transition-all flex flex-col justify-between min-h-[85px] relative group ${cardStyle} ${
                day.isToday ? 'ring-2 ring-orange-500 shadow-md' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm md:text-base font-black ${day.isToday ? 'text-orange-600' : ''}`}>
                  {day.dayNumber}
                </span>
                {day.isToday && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[9px] font-black rounded-md uppercase">
                    Today
                  </span>
                )}
              </div>

              <div>
                {statusContent}
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Comparison Summary Cards (Previous, Current & Next Month) */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <FiTrendingUp className="text-indigo-600 w-4 h-4" />
            <span>Previous, Current & Next Month Leave Comparison & Forecast</span>
          </h4>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit">
            Click on any month card for full popup report
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. PREVIOUS / LAST MONTH CARD */}
          <div 
            onClick={() => setAnalyticsModalMonth('previous')}
            className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100/60 p-5 rounded-3xl border border-indigo-200/90 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
            title="Click to view full previous month leave & duty breakdown"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-indigo-500" />
                Previous Month ({lastMonthStats.shortMonth})
              </span>
              <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-100/90 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1 shadow-xs">
                <span>Analytics</span>
                <FiExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-indigo-950">
                {lastMonthStats.leavesTaken} <span className="text-sm font-extrabold text-indigo-400">Days</span>
              </p>
              {lastMonthStats.isZeroLeaves && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ⭐ Clean Record
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-semibold mt-1">
              Approved leave count in previous month
            </p>

            {/* Enriched Data Matrix for Last Month */}
            <div className="mt-4 pt-3 border-t border-indigo-200/70 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-indigo-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-500 block">Duty Present</span>
                <span className="font-black text-slate-800 text-sm">{lastMonthStats.daysPresent} / {lastMonthStats.workingDays}</span>
                <span className="text-[10px] text-emerald-700 font-extrabold block">({lastMonthStats.attendanceRate}% Rate)</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-indigo-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-500 block">Quota Intact</span>
                <span className="font-black text-slate-800 text-sm">{lastMonthStats.preservedQuotas} / 37</span>
                <span className="text-[10px] text-indigo-700 font-extrabold block">(Past Record)</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-extrabold text-indigo-700 group-hover:text-indigo-900">
              <span>View previous month breakdown</span>
              <span>↗</span>
            </div>
          </div>

          {/* 2. CURRENT MONTH CARD */}
          <div 
            onClick={() => setAnalyticsModalMonth('current')}
            className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 p-5 rounded-3xl border border-orange-200/90 hover:border-orange-400 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
            title="Click to view full current month leave & duty breakdown"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-extrabold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                Current Month ({currentStats.shortMonth})
              </span>
              <span className="text-[10px] font-extrabold text-orange-600 bg-orange-100/90 group-hover:bg-orange-500 group-hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1 shadow-xs">
                <span>Analytics</span>
                <FiExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-slate-900">
                {currentStats.leavesTaken} <span className="text-sm font-extrabold text-slate-400">Days</span>
              </p>
              {currentStats.isZeroLeaves && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ⭐ 100% Duty
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-semibold mt-1">
              Approved leave count in current active month
            </p>

            {/* Enriched Data Matrix for Current Month */}
            <div className="mt-4 pt-3 border-t border-orange-200/70 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-orange-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-500 block">Duty Present</span>
                <span className="font-black text-slate-800 text-sm">{currentStats.daysPresent} / {currentStats.workingDays}</span>
                <span className="text-[10px] text-emerald-700 font-extrabold block">({currentStats.attendanceRate}% Rate)</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-orange-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-500 block">Quota Intact</span>
                <span className="font-black text-slate-800 text-sm">{currentStats.preservedQuotas} / 37</span>
                <span className="text-[10px] text-indigo-700 font-extrabold block">(100% Reserved)</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-extrabold text-orange-700 group-hover:text-orange-900">
              <span>View current duty report</span>
              <span>↗</span>
            </div>
          </div>

          {/* 3. NEXT / UPCOMING MONTH CARD */}
          <div 
            onClick={() => setAnalyticsModalMonth('next')}
            className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 p-5 rounded-3xl border border-emerald-200/90 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden"
            title="Click to view full next month scheduled leaves & advance forecast"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <FiCalendar className="w-3.5 h-3.5 text-emerald-600" />
                Next Month ({nextMonthStats.shortMonth})
              </span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/90 group-hover:bg-emerald-600 group-hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1 shadow-xs">
                <span>Forecast</span>
                <FiExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-emerald-950">
                {nextMonthStats.leavesTaken} <span className="text-sm font-extrabold text-emerald-400">Days</span>
              </p>
              {nextMonthStats.isZeroLeaves ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ⭐ 0 Scheduled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                  📅 Scheduled
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-semibold mt-1">
              Scheduled leaves approved for upcoming month
            </p>

            {/* Enriched Data Matrix for Next Month */}
            <div className="mt-4 pt-3 border-t border-emerald-200/70 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-emerald-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-500 block">Projected Duty</span>
                <span className="font-black text-slate-800 text-sm">{nextMonthStats.daysPresent} / {nextMonthStats.workingDays}</span>
                <span className="text-[10px] text-emerald-700 font-extrabold block">({nextMonthStats.attendanceRate}% Proj.)</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-emerald-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-black text-slate-500 block">Quota Intact</span>
                <span className="font-black text-slate-800 text-sm">{nextMonthStats.preservedQuotas} / 37</span>
                <span className="text-[10px] text-indigo-700 font-extrabold block">(Available)</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-extrabold text-emerald-800 group-hover:text-emerald-950">
              <span>View upcoming month forecast</span>
              <span>↗</span>
            </div>
          </div>
        </div>

        {/* Comparative Summary Banner & Extended Navigation */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <FiShield className="text-indigo-600 w-4 h-4 flex-shrink-0" />
            <span>
              3-Month Trajectory: Past ({lastMonthStats.leavesTaken} d) • Current ({currentStats.leavesTaken} d) • Next Month ({nextMonthStats.leavesTaken} d scheduled).
            </span>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setAnalyticsModalMonth('next2')}
              className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FiCalendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Advance Forecast: {nextNextMonthStats.monthName} (+2)</span>
              <FiExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* COMPLETE LEAVE RECORDS & APPROVALS (LEAVE MANAGEMENT) */}
      <div className="pt-6 border-t border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-2">
              <FiFileText className="text-orange-500 w-4 h-4" />
              <span>Complete Leave Records & Approvals ({facultyLeaves.length})</span>
            </h4>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Historical leave records, approval statuses, and approver audit notes for {facultyName}
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({facultyLeaves.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                statusFilter === 'pending' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pending ({facultyLeaves.filter(l => l && l.status === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Approved ({facultyLeaves.filter(l => l && l.status === 'approved').length})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                statusFilter === 'rejected' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Rejected ({facultyLeaves.filter(l => l && l.status === 'rejected').length})
            </button>
          </div>
        </div>

        {/* Leave Table */}
        <div className="overflow-x-auto">
          {filteredLeaves.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-10 text-center text-slate-400 border border-dashed border-slate-200">
              <FiCalendar className="w-9 h-9 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Leave Records Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No leave entries match the selected status filter</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Leave Type</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Total Days</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Actions / Approver Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredLeaves.map((leave) => {
                  const applicantId = String(leave.applicant?._id || leave.applicant || '');
                  const applicantEmail = leave.applicant?.email;
                  const isSelfLeave = (applicantId && applicantId === currentUser?._id) ||
                                     (applicantEmail && applicantEmail === currentUser?.email) ||
                                     (facultyId && String(facultyId) === String(currentUser?._id));

                  return (
                    <tr key={leave._id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">{getLeaveTypeBadge(leave.leaveType)}</td>
                      <td className="p-3.5 font-semibold text-slate-600">
                        {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {leave.endDate && ` - ${new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {leave.totalDays || 1} {leave.totalDays > 1 ? 'Days' : 'Day'}
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-slate-600" title={leave.reason}>
                        {leave.reason || '—'}
                      </td>
                      <td className="p-3.5">{getStatusBadge(leave.status)}</td>
                      <td className="p-3.5 text-right">
                        {canReviewLeave(leave) ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setReviewModal({ leave, action: 'approved' })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <FiCheck className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => setReviewModal({ leave, action: 'rejected' })}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <FiX className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (isSelfLeave && (leave.status === 'pending' || leave.status === 'approved')) ? (
                          <button
                            onClick={() => handleCancelLeave(leave._id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="Cancel your leave application"
                          >
                            Cancel Leave
                          </button>
                        ) : leave.reviewComment ? (
                          <span className="text-[11px] text-slate-500 italic" title={leave.reviewComment}>
                            "{leave.reviewComment}"
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Comprehensive Monthly Leave & Attendance Analytics Popup Modal */}
      {analyticsModalMonth && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[70] p-3 sm:p-6 overflow-y-auto"
          onClick={() => setAnalyticsModalMonth(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="px-3 py-1 bg-white/10 text-orange-300 text-[11px] font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 mb-2 border border-white/10">
                    <FiPieChart className="w-3.5 h-3.5 text-orange-400" />
                    Attendance & Duty Analytics
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeModalStats.monthName} Report
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Detailed duty attendance, approved leaves & institutional quota preservation
                  </p>
                </div>

                <button
                  onClick={() => setAnalyticsModalMonth(null)}
                  className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Month Switcher Tabs inside Popup */}
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                <span className="text-xs font-bold text-slate-400 mr-1">Select Month:</span>
                
                <button
                  onClick={() => setAnalyticsModalMonth(modalOffset - 1)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Previous Month"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setAnalyticsModalMonth('previous')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    modalOffset === -1
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <FiClock className="w-3.5 h-3.5" />
                  Previous ({lastMonthStats.shortMonth})
                </button>

                <button
                  onClick={() => setAnalyticsModalMonth('current')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    modalOffset === 0
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${modalOffset === 0 ? 'bg-white' : 'bg-orange-400'}`}></span>
                  Current ({currentStats.shortMonth})
                </button>

                <button
                  onClick={() => setAnalyticsModalMonth('next')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    modalOffset === 1
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <FiCalendar className="w-3.5 h-3.5" />
                  Next ({nextMonthStats.shortMonth})
                </button>

                <button
                  onClick={() => setAnalyticsModalMonth('next2')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    modalOffset === 2
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <span>{nextNextMonthStats.shortMonth} (+2)</span>
                </button>

                <button
                  onClick={() => setAnalyticsModalMonth(modalOffset + 1)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Next Month"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Faculty Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-sm">
                    {facultyName?.charAt(0) || 'F'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{facultyName}</h4>
                    <p className="text-xs text-slate-500 capitalize">{facultyDept} Department • {facultyRole}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-black rounded-full border ${
                    modalOffset < 0
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : modalOffset === 0
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {modalOffset < 0 ? 'Archived Past Record' : modalOffset === 0 ? 'Active Current Month' : 'Upcoming Advance Forecast'}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Duty Verified
                  </span>
                </div>
              </div>

              {/* Standing Banner */}
              {modalOffset > 0 ? (
                activeModalStats.isZeroLeaves ? (
                  <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-500/10 flex items-start gap-3.5">
                    <div className="p-2.5 bg-white/20 rounded-2xl flex-shrink-0">
                      <FiCheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm sm:text-base flex items-center gap-2">
                        <span>⭐ Zero Leaves Scheduled for {activeModalStats.monthName}</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-50 mt-1 leading-relaxed">
                        No advance leaves or absences have been requested for <strong>{activeModalStats.monthName}</strong>. The faculty member has a projected 100% duty attendance rate across all <strong>{activeModalStats.workingDays} scheduled working days</strong> with annual quotas completely preserved.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-teal-600 via-indigo-600 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-teal-500/10 flex items-start gap-3.5">
                    <div className="p-2.5 bg-white/20 rounded-2xl flex-shrink-0">
                      <FiCalendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm sm:text-base">
                        Advance Leaves Scheduled for {activeModalStats.monthName}
                      </h4>
                      <p className="text-xs sm:text-sm text-teal-50 mt-1 leading-relaxed">
                        The faculty member has <strong>{activeModalStats.leavesTaken} advance leave days</strong> scheduled for {activeModalStats.monthName}. Projected duty presence: <strong>{activeModalStats.daysPresent} of {activeModalStats.workingDays} working days</strong> ({activeModalStats.attendanceRate}% projected attendance rate).
                      </p>
                    </div>
                  </div>
                )
              ) : activeModalStats.isZeroLeaves ? (
                <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-500/10 flex items-start gap-3.5">
                  <div className="p-2.5 bg-white/20 rounded-2xl flex-shrink-0">
                    <FiCheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base flex items-center gap-2">
                      <span>⭐ Exemplary 100% Attendance Standing</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-emerald-50 mt-1 leading-relaxed">
                      Zero unapproved leaves or deductions registered in <strong>{activeModalStats.monthName}</strong>. The faculty member was present and on active duty across all <strong>{activeModalStats.workingDays} institutional working days</strong>. All 37 institutional leave quota balances are 100% preserved.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-indigo-500/10 flex items-start gap-3.5">
                  <div className="p-2.5 bg-white/20 rounded-2xl flex-shrink-0">
                    <FiActivity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base">
                      Duty & Leave Summary for {activeModalStats.monthName}
                    </h4>
                    <p className="text-xs sm:text-sm text-indigo-50 mt-1 leading-relaxed">
                      The faculty member had <strong>{activeModalStats.leavesTaken} leave days</strong> approved in {activeModalStats.monthName}. Maintained a duty attendance rate of <strong>{activeModalStats.attendanceRate}%</strong> across all {activeModalStats.workingDays} working days.
                    </p>
                  </div>
                </div>
              )}

              {/* 4 Core KPI Highlights */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Leaves Deducted / Scheduled */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    {modalOffset > 0 ? 'Scheduled Leaves' : 'Leaves Deducted'}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    {activeModalStats.leavesTaken} <span className="text-xs font-bold text-slate-400">Days</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {activeModalStats.isZeroLeaves ? 'Zero days absent' : 'Approved leave days'}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-black ${
                    activeModalStats.isZeroLeaves ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activeModalStats.isZeroLeaves ? (modalOffset > 0 ? '0 Scheduled' : '100% Punctual') : 'Leaves On Record'}
                  </span>
                </div>

                {/* 2. Attendance Rate */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    {modalOffset > 0 ? 'Projected Attendance' : 'Duty Attendance Rate'}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700">
                    {activeModalStats.attendanceRate}%
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${activeModalStats.attendanceRate}%` }} 
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {activeModalStats.daysPresent} of {activeModalStats.workingDays} Duty Days
                  </p>
                </div>

                {/* 3. Working Days */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Working Days</span>
                  <p className="text-2xl sm:text-3xl font-black text-indigo-700">
                    {activeModalStats.workingDays} <span className="text-xs font-bold text-slate-400">Days</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {activeModalStats.totalDaysInMonth} total days, {activeModalStats.sundaysCount} Sundays off
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800">
                    Academic Schedule
                  </span>
                </div>

                {/* 4. Quotas Preserved */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Quota Available</span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    {activeModalStats.preservedQuotas} <span className="text-xs font-bold text-slate-400">/ 37</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    Institutional quota intact
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800">
                    {activeModalStats.isZeroLeaves ? '100% Reserved' : `${37 - activeModalStats.preservedQuotas} Used`}
                  </span>
                </div>
              </div>

              {/* Leave Category Quota Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <FiAward className="text-orange-500 w-4 h-4" />
                  <span>Institutional Leave Quotas Breakdown ({activeModalStats.monthName})</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                    <span className="text-[10px] font-black text-blue-700 uppercase block mb-1">Casual Leave (CL)</span>
                    <p className="text-lg font-black text-slate-900">{activeModalStats.clTaken} <span className="text-xs text-slate-500 font-bold">/ 12 Used</span></p>
                    <div className="w-full bg-blue-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${(activeModalStats.clTaken / 12) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 block mt-1">{12 - activeModalStats.clTaken} Days Available</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80">
                    <span className="text-[10px] font-black text-rose-700 uppercase block mb-1">Sick Leave (SL)</span>
                    <p className="text-lg font-black text-slate-900">{activeModalStats.slTaken} <span className="text-xs text-slate-500 font-bold">/ 10 Used</span></p>
                    <div className="w-full bg-rose-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-rose-600 h-full" style={{ width: `${(activeModalStats.slTaken / 10) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 block mt-1">{10 - activeModalStats.slTaken} Days Available</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80">
                    <span className="text-[10px] font-black text-purple-700 uppercase block mb-1">Earned Leave (EL)</span>
                    <p className="text-lg font-black text-slate-900">{activeModalStats.elTaken} <span className="text-xs text-slate-500 font-bold">/ 15 Used</span></p>
                    <div className="w-full bg-purple-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-purple-600 h-full" style={{ width: `${(activeModalStats.elTaken / 15) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 block mt-1">{15 - activeModalStats.elTaken} Days Available</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80">
                    <span className="text-[10px] font-black text-amber-700 uppercase block mb-1">On Duty (OD)</span>
                    <p className="text-lg font-black text-slate-900">{activeModalStats.odTaken} <span className="text-xs text-slate-500 font-bold">Days</span></p>
                    <div className="w-full bg-amber-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-600 h-full" style={{ width: `${Math.min(100, activeModalStats.odTaken * 10)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 block mt-1">Official Academic Duty</span>
                  </div>
                </div>
              </div>

              {/* Monthly Leave Applications History / Duty Verification */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <FiCalendar className="text-slate-500 w-4 h-4" />
                  <span>Leave Records Filed in {activeModalStats.monthName}</span>
                </h4>

                {activeModalStats.monthLeaves.length === 0 ? (
                  <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-2xl p-6 text-center text-slate-600">
                    <FiShield className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-extrabold text-slate-900">No Leave Applications on File</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      The faculty member had 100% uninterrupted active attendance across all {activeModalStats.workingDays} working days in {activeModalStats.monthName}. No leaves were requested or approved.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Duration</th>
                          <th className="p-3">Days</th>
                          <th className="p-3">Reason</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeModalStats.monthLeaves.map((l) => (
                          <tr key={l._id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold capitalize">{l.leaveType} Leave</td>
                            <td className="p-3 text-slate-600">
                              {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-black text-slate-900">{l.totalDays || 1} d</td>
                            <td className="p-3 text-slate-600 italic">"{l.reason || 'Not specified'}"</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] uppercase">
                                Approved
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <FiShield className="w-4 h-4 text-emerald-600" />
                Verified by SSES Academic Attendance & Leave Registry
              </span>
              <button
                onClick={() => setAnalyticsModalMonth(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition text-xs shadow-sm cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal Dialog for HOD / Admin */}
      {reviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              reviewModal.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {reviewModal.action === 'approved' ? <FiCheck className="w-6 h-6" /> : <FiX className="w-6 h-6" />}
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 mb-1 capitalize">
              {reviewModal.action} Leave Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {facultyName} ({reviewModal.leave?.totalDays || 1} Days)
            </p>

            <textarea
              rows="3"
              placeholder="Add optional review comment..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium mb-4 focus:ring-2 focus:ring-orange-400"
            />

            <div className="flex gap-3">
              <button
                onClick={handleReviewAction}
                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer ${
                  reviewModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                Confirm {reviewModal.action}
              </button>
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <FiPlus className="text-orange-500 w-5 h-5" />
                  <span>Apply for Leave</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Submit a leave request for {facultyName}
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Leave Type</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-400"
                >
                  <option value="casual">Casual Leave (CL)</option>
                  <option value="sick">Sick Leave (SL)</option>
                  <option value="earned">Earned Leave (EL)</option>
                  <option value="duty">On Duty (OD)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Reason for Leave</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Provide detailed justification for leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FiCheck className="w-4 h-4" />
                  <span>{submittingLeave ? 'Submitting...' : 'Submit Application'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-xs cursor-pointer"
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

export default FacultyAttendanceCalendar;