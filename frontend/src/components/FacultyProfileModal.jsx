import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI, taskAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import { 
  FiX, 
  FiUser, 
  FiMail, 
  FiBriefcase, 
  FiCalendar, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiCheck, 
  FiActivity, 
  FiCheckSquare,
  FiFileText,
  FiAward,
  FiChevronLeft,
  FiTrendingUp,
  FiEye
} from 'react-icons/fi';

const FacultyProfileModal = ({ faculty, facultyId, onClose, onRefresh }) => {
  const { user: currentUser } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [facultyLeaves, setFacultyLeaves] = useState([]);
  const [facultyTasks, setFacultyTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'history' | 'tasks'
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');
  const [selectedMonthDetailsModal, setSelectedMonthDetailsModal] = useState(null);

  // Month navigation state for day-by-day 1 to 30/31 breakdown
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);

  const handleOpenMonthLeaveModal = (type) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (type === 'current') {
      const currentMonthLeaves = facultyLeaves.filter(l => {
        const d = new Date(l.startDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });

      const takenLeaves = currentMonthLeaves.filter(l => {
        const start = new Date(l.startDate).getTime();
        return start <= todayTimestamp || l.status === 'approved';
      });

      const upcomingLeaves = facultyLeaves.filter(l => {
        const start = new Date(l.startDate).getTime();
        return start > todayTimestamp && l.status !== 'rejected';
      });

      const totalDaysTaken = takenLeaves.filter(l => l.status === 'approved').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const casualDays = takenLeaves.filter(l => l.status === 'approved' && l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const sickDays = takenLeaves.filter(l => l.status === 'approved' && l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const earnedDays = takenLeaves.filter(l => l.status === 'approved' && l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const dutyDays = takenLeaves.filter(l => l.status === 'approved' && l.leaveType === 'duty').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

      setSelectedMonthDetailsModal({
        type: 'current',
        title: `Current Month (${monthNames[currentMonth]} ${currentYear}) & Upcoming Leaves`,
        monthName: monthNames[currentMonth],
        year: currentYear,
        totalDaysTaken,
        casualDays,
        sickDays,
        earnedDays,
        dutyDays,
        takenLeaves,
        upcomingLeaves
      });
    } else {
      // Previous 5-6 Months History Breakdown
      const sixMonthsHistory = [];
      let grandTotalDays = 0;

      for (let i = 1; i <= 6; i++) {
        let targetMonthIndex = currentMonth - i;
        let targetYearNum = currentYear;
        if (targetMonthIndex < 0) {
          targetMonthIndex += 12;
          targetYearNum -= 1;
        }

        const mName = monthNames[targetMonthIndex];
        const mLeaves = facultyLeaves.filter(l => {
          const d = new Date(l.startDate);
          return d.getFullYear() === targetYearNum && d.getMonth() === targetMonthIndex && l.status === 'approved';
        });

        const mDays = mLeaves.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
        grandTotalDays += mDays;

        sixMonthsHistory.push({
          monthName: mName,
          year: targetYearNum,
          totalDays: mDays,
          leaves: mLeaves
        });
      }

      setSelectedMonthDetailsModal({
        type: 'previous',
        title: `Last 6 Months Leave History & Breakdown`,
        sixMonthsHistory,
        grandTotalDays
      });
    }
  };

  useEffect(() => {
    fetchFacultyFullDetails();
  }, [faculty, facultyId]);

  const fetchFacultyFullDetails = async () => {
    setLoading(true);
    try {
      const targetId = faculty?._id || facultyId || currentUser?._id;
      const targetName = faculty?.name || currentUser?.name || 'Faculty Member';
      const targetEmail = faculty?.email || currentUser?.email;
      const targetDept = faculty?.department || currentUser?.department || 'General';
      const targetRole = faculty?.role || currentUser?.role || 'user';

      const [leavesRes, tasksRes, attendanceRes] = await Promise.all([
        leaveAPI.getLeaves(),
        taskAPI.getTasks(),
        leaveAPI.getDailyAttendance()
      ]);

      const allLeaves = leavesRes.data || [];
      const userLeaves = allLeaves.filter(l => {
        const applicantId = l.applicant?._id || l.applicant;
        const applicantEmail = l.applicant?.email;
        const matchesId = applicantId && targetId && String(applicantId) === String(targetId);
        const matchesEmail = applicantEmail && targetEmail && applicantEmail.toLowerCase() === targetEmail.toLowerCase();
        return matchesId || matchesEmail;
      });
      setFacultyLeaves(userLeaves);

      const allTasks = tasksRes.data || [];
      const userTasks = allTasks.filter(t => {
        if (!t.assignedTo) return false;
        if (Array.isArray(t.assignedTo)) {
          return t.assignedTo.some(u => {
            const uid = u._id || u;
            const uemail = u.email;
            return (uid && targetId && String(uid) === String(targetId)) || 
                   (uemail && targetEmail && uemail.toLowerCase() === targetEmail.toLowerCase());
          });
        }
        const uid = t.assignedTo._id || t.assignedTo;
        const uemail = t.assignedTo.email;
        return (uid && targetId && String(uid) === String(targetId)) || 
               (uemail && targetEmail && uemail.toLowerCase() === targetEmail.toLowerCase());
      });
      setFacultyTasks(userTasks);

      // Find active today attendance info
      const allDepts = attendanceRes.data || [];
      const deptInfo = allDepts.find(d => d.department === targetDept);
      let activeFacultyItem = null;
      if (deptInfo && deptInfo.facultyList) {
        activeFacultyItem = deptInfo.facultyList.find(f => 
          (f._id && targetId && String(f._id) === String(targetId)) ||
          (f.email && targetEmail && f.email.toLowerCase() === targetEmail.toLowerCase())
        );
      }

      // Calculate leave balances & metrics
      const approvedLeaves = userLeaves.filter(l => l.status === 'approved');
      const casualTaken = approvedLeaves.filter(l => l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const sickTaken = approvedLeaves.filter(l => l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const earnedTaken = approvedLeaves.filter(l => l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const dutyTaken = approvedLeaves.filter(l => l.leaveType === 'duty').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

      // Calculate monthly stats (Current Month vs Last Month)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      const currentMonthLeavesList = approvedLeaves.filter(l => {
        const d = new Date(l.startDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      const currentMonthDays = currentMonthLeavesList.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

      const lastMonthLeavesList = approvedLeaves.filter(l => {
        const d = new Date(l.startDate);
        return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
      });
      const lastMonthDays = lastMonthLeavesList.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

      setProfileData({
        _id: targetId,
        name: activeFacultyItem?.name || targetName,
        email: activeFacultyItem?.email || targetEmail,
        department: targetDept,
        role: targetRole,
        isPresentToday: activeFacultyItem ? activeFacultyItem.isPresentToday : true,
        activeLeaveToday: activeFacultyItem?.activeLeaveToday || null,
        monthlyLeavesTaken: currentMonthDays,
        lastMonthLeavesTaken: lastMonthDays,
        quota: {
          casual: { used: casualTaken, total: 12, balance: Math.max(0, 12 - casualTaken) },
          sick: { used: sickTaken, total: 10, balance: Math.max(0, 10 - sickTaken) },
          earned: { used: earnedTaken, total: 15, balance: Math.max(0, 15 - earnedTaken) },
          duty: { taken: dutyTaken }
        }
      });
    } catch (error) {
      console.error('Error fetching faculty profile details:', error);
      toast.error('Failed to load faculty profile');
    } finally {
      setLoading(false);
    }
  };

  const buildMonthDateMatrix = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(now.getFullYear(), now.getMonth() + selectedMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysArray = [];

    const approvedLeaves = facultyLeaves.filter(l => l.status === 'approved');

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);

      const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dayDate.getDay() === 0;
      const isFuture = dayDate.getTime() > today.getTime();
      const isToday = dayDate.getTime() === today.getTime();

      const activeLeaveOnDay = approvedLeaves.find(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
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

  const canReviewLeave = (leave) => {
    if (!leave || leave.status !== 'pending') return false;
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'hod') {
      const applicantId = leave.applicant?._id || leave.applicant;
      const applicantEmail = leave.applicant?.email;
      const isSelfLeave = (applicantId && String(applicantId) === String(currentUser?._id)) || (applicantEmail && applicantEmail.toLowerCase() === currentUser?.email?.toLowerCase());
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
      fetchFacultyFullDetails();
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
      fetchFacultyFullDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel leave');
    }
  };

  const filteredLeaves = facultyLeaves.filter(leave => {
    return statusFilter === 'all' || leave.status === statusFilter;
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
      case 'pending': return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-amber-300"><FiClock className="w-3.5 h-3.5" /> Pending</span>;
      case 'approved': return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-emerald-300"><FiCheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'rejected': return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-rose-300"><FiXCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full flex items-center gap-1 border border-slate-300">Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto fade-in space-y-6">
        {/* Header Profile Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-t-3xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition backdrop-blur-md"
          >
            <FiX className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black text-2xl md:text-3xl flex items-center justify-center shadow-xl shadow-orange-500/20 border-2 border-white/20">
              {profileData?.name?.charAt(0).toUpperCase() || 'F'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-white">{profileData?.name}</h2>
                <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-extrabold rounded-full border border-orange-500/30 uppercase tracking-wider">
                  {profileData?.role === 'hod' ? 'HOD' : 'Faculty Member'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 flex items-center gap-2">
                <FiMail className="w-4 h-4 text-orange-400" />
                <span>{profileData?.email}</span>
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <FiBriefcase className="w-4 h-4 text-amber-400" />
                <span>{profileData?.department} Department</span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2 relative z-10 min-w-[200px]">
            <p className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">Today's Duty Status</p>
            {profileData?.isPresentToday ? (
              <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-xl border border-emerald-500/30 flex items-center gap-2 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                On Active Duty Today
              </span>
            ) : (
              <span className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 text-xs font-black rounded-xl border border-rose-500/30 flex items-center gap-2 w-fit">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                On Leave Today ({profileData?.activeLeaveToday?.leaveType || 'Approved Leave'})
              </span>
            )}
            {profileData?.activeLeaveToday?.reason && (
              <p className="text-[11px] text-slate-300 italic truncate max-w-xs">
                "{profileData.activeLeaveToday.reason}"
              </p>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6 pt-0">
          {/* SECTION 1: LEAVE QUOTA BALANCES & SUMMARY */}
          <div>
            <h3 className="text-base font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <FiAward className="text-orange-500 w-5 h-5" />
              <span>Faculty Leave Quotas & Yearly Balances</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-4 border border-blue-200/80 bg-blue-50/30">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase block mb-1">Casual Leave (CL)</span>
                <p className="text-xl md:text-2xl font-black text-slate-900">
                  {profileData?.quota?.casual?.balance} <span className="text-xs font-bold text-slate-400">/ 12 Left</span>
                </p>
                <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${(profileData?.quota?.casual?.used / 12) * 100}%` }} />
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">{profileData?.quota?.casual?.used} Days Used</p>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-rose-200/80 bg-rose-50/30">
                <span className="text-[10px] font-extrabold text-rose-600 uppercase block mb-1">Sick Leave (SL)</span>
                <p className="text-xl md:text-2xl font-black text-slate-900">
                  {profileData?.quota?.sick?.balance} <span className="text-xs font-bold text-slate-400">/ 10 Left</span>
                </p>
                <div className="w-full bg-rose-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-rose-600 h-full" style={{ width: `${(profileData?.quota?.sick?.used / 10) * 100}%` }} />
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">{profileData?.quota?.sick?.used} Days Used</p>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-purple-200/80 bg-purple-50/30">
                <span className="text-[10px] font-extrabold text-purple-600 uppercase block mb-1">Earned Leave (EL)</span>
                <p className="text-xl md:text-2xl font-black text-slate-900">
                  {profileData?.quota?.earned?.balance} <span className="text-xs font-bold text-slate-400">/ 15 Left</span>
                </p>
                <div className="w-full bg-purple-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-purple-600 h-full" style={{ width: `${(profileData?.quota?.earned?.used / 15) * 100}%` }} />
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">{profileData?.quota?.earned?.used} Days Used</p>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-amber-200/80 bg-amber-50/30">
                <span className="text-[10px] font-extrabold text-amber-600 uppercase block mb-1">Monthly Leaves Taken</span>
                <p className="text-xl md:text-2xl font-black text-amber-700">
                  {profileData?.monthlyLeavesTaken} <span className="text-xs font-bold text-slate-400">Days</span>
                </p>
                <p className="text-[10px] font-semibold text-slate-500 mt-3">Approved leaves this month</p>
              </div>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === 'calendar' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiCalendar className="w-4 h-4" />
              <span>1 to 30/31 Daily Leave Calendar Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('history'); setStatusFilter('all'); }}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                (activeTab === 'history' || activeTab === 'leaves') ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiFileText className="w-4 h-4" />
              <span>All Leave Records & Approvals ({facultyLeaves.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === 'tasks' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiCheckSquare className="w-4 h-4" />
              <span>Faculty Tasks ({facultyTasks.length})</span>
            </button>
          </div>

          {/* TAB 1: 1 TO 30/31 DAY-BY-DAY LEAVE CALENDAR MATRIX */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <FiCalendar className="text-orange-500 w-5 h-5" />
                    <span>Monthly Attendance Breakdown: {currentMonthMatrix.monthName}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Complete day-by-day status from Day 1 to Day {currentMonthMatrix.totalDaysInMonth}
                  </p>
                </div>

                {/* Month Selector Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonthOffset(prev => prev - 1)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                      selectedMonthOffset === -1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    <span>Last Month</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMonthOffset(0)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                      selectedMonthOffset === 0 ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>This Month</span>
                  </button>
                </div>
              </div>

              {/* Legend & Summary Info */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold text-slate-600 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 inline-block shadow-xs"></span>
                  <span className="hidden sm:inline">Present / Active Duty</span>
                  <span className="sm:hidden">P = Present</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-rose-500 inline-block shadow-xs"></span>
                  <span className="hidden sm:inline">On Approved / Scheduled Leave</span>
                  <span className="sm:hidden">A = Absent / Leave</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-amber-200 border border-amber-400 inline-block"></span>
                  <span className="hidden sm:inline">Sunday (Weekend)</span>
                  <span className="sm:hidden">S = Sunday</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300 inline-block"></span>
                  <span className="hidden sm:inline">Upcoming Date (Disabled)</span>
                  <span className="sm:hidden">- = Upcoming</span>
                </span>
              </div>

              {/* 7-COLUMN WEEKDAY HEADERS (STARTS WITH SUNDAY ON LEFT) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-extrabold text-slate-600 uppercase tracking-wider bg-slate-100/80 p-2 sm:p-3 rounded-2xl border border-slate-200/80">
                <div className="text-rose-600 font-black">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* 7-COLUMN CALENDAR GRID */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty padding cells for days before 1st of month */}
                {Array.from({ length: currentMonthMatrix.firstDayOfWeek }).map((_, i) => (
                  <div key={`padding-${i}`} className="bg-slate-50/40 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-slate-100/60 opacity-30 min-h-[50px] sm:min-h-[85px]" />
                ))}

                {/* Actual Date Cells */}
                {currentMonthMatrix.daysArray.map((day) => {
                  let cardStyle = "bg-emerald-50/40 border-emerald-200 text-emerald-900";
                  let statusContent = (
                    <div>
                      <span className="hidden sm:flex text-[11px] font-extrabold text-emerald-700 items-center gap-1">
                        <FiCheck className="w-3 h-3 text-emerald-600" /> Present
                      </span>
                      <span className="sm:hidden text-[11px] font-black text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded-md inline-block">
                        P
                      </span>
                    </div>
                  );

                  if (day.isLeave) {
                    cardStyle = "bg-rose-50 border-rose-300 text-rose-900 shadow-xs ring-1 ring-rose-300/50";
                    statusContent = (
                      <div>
                        <div className="hidden sm:block">
                          <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-black uppercase inline-block mb-1 shadow-2xs">
                            {day.isFuture ? 'Scheduled Leave' : (day.leaveDetails?.leaveType || 'Leave')}
                          </span>
                          <p className="text-[11px] font-bold truncate text-rose-800" title={day.leaveDetails?.reason}>
                            "{day.leaveDetails?.reason}"
                          </p>
                        </div>
                        <div className="sm:hidden">
                          <span className="text-[11px] font-black text-white bg-rose-600 px-1.5 py-0.5 rounded-md inline-block shadow-2xs" title={day.leaveDetails?.reason || 'On Leave'}>
                            A
                          </span>
                        </div>
                      </div>
                    );
                  } else if (day.isFuture) {
                    // Future date without scheduled leave -> Disabled style
                    cardStyle = "bg-slate-50/80 border-slate-200/70 text-slate-400 opacity-60 cursor-not-allowed";
                    statusContent = (
                      <div>
                        <span className="hidden sm:block text-[11px] font-semibold text-slate-400 italic">
                          Upcoming
                        </span>
                        <span className="sm:hidden text-[10px] font-semibold text-slate-400">
                          -
                        </span>
                      </div>
                    );
                  } else if (day.isSunday) {
                    cardStyle = "bg-amber-50/70 border-amber-200 text-amber-900";
                    statusContent = (
                      <div>
                        <span className="hidden sm:block text-[11px] font-bold text-amber-700">Sunday</span>
                        <span className="sm:hidden text-[11px] font-black text-amber-800 bg-amber-200/90 px-1.5 py-0.5 rounded-md inline-block">
                          S
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={day.dayNumber}
                      className={`calendar-day-cell rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border transition-all flex flex-col justify-between min-h-[50px] sm:min-h-[85px] relative group ${cardStyle} ${
                        day.isToday ? 'ring-2 ring-orange-500 shadow-md' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className={`calendar-day-number text-xs sm:text-sm md:text-base font-black ${day.isToday ? 'text-orange-600' : ''}`}>
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span className="px-1 sm:px-1.5 py-0.5 bg-orange-500 text-white text-[7px] sm:text-[9px] font-black rounded-md uppercase">
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

              {/* Monthly Comparison Summary Table */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FiTrendingUp className="text-indigo-600 w-4 h-4" />
                    <span>Current Month vs Last Month Leave Comparison</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">Click card for details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleOpenMonthLeaveModal('current')}
                    className="w-full text-left bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/40 p-5 rounded-2xl border border-orange-200/80 hover:border-orange-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-orange-700 uppercase tracking-wider block">Current Month Leaves</span>
                      <span className="text-[11px] font-bold text-orange-700 bg-orange-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-orange-500 group-hover:text-white transition">
                        Details <FiEye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 mt-1">{profileData?.monthlyLeavesTaken} Days</p>
                    <p className="text-xs text-slate-600 font-semibold mt-1">Click to view leave types, dates & approved list</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMonthLeaveModal('previous')}
                    className="w-full text-left bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100/40 p-5 rounded-2xl border border-indigo-200/80 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider block">Previous / Last Month Leaves</span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-indigo-600 group-hover:text-white transition">
                        Details <FiEye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="text-3xl font-black text-indigo-950 mt-1">{profileData?.lastMonthLeavesTaken} Days</p>
                    <p className="text-xs text-slate-600 font-semibold mt-1">Click to view leave types, dates & approved list</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE LEAVE HISTORY */}
          {(activeTab === 'history' || activeTab === 'leaves') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'all' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    All ({facultyLeaves.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'pending' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Pending ({facultyLeaves.filter(l => l.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Approved ({facultyLeaves.filter(l => l.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('rejected')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'rejected' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Rejected ({facultyLeaves.filter(l => l.status === 'rejected').length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredLeaves.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400">
                    <FiCalendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No Leave History Records</p>
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
                        <th className="p-3.5 text-right rounded-r-2xl">Actions / Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredLeaves.map((leave) => (
                        <tr key={leave._id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">{getLeaveTypeBadge(leave.leaveType)}</td>
                          <td className="p-3.5 font-semibold text-slate-600">
                            {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">{leave.totalDays} {leave.totalDays > 1 ? 'Days' : 'Day'}</td>
                          <td className="p-3.5 max-w-xs truncate text-slate-600" title={leave.reason}>{leave.reason}</td>
                          <td className="p-3.5">{getStatusBadge(leave.status)}</td>
                          <td className="p-3.5 text-right">
                            {canReviewLeave(leave) ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReviewModal({ leave, action: 'approved' })}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                >
                                  <FiCheck className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewModal({ leave, action: 'rejected' })}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                >
                                  <FiX className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : (((leave.applicant?._id === currentUser?._id) || (leave.applicant === currentUser?._id) || (leave.applicant?.email === currentUser?.email) || (profileData?._id === currentUser?._id)) && (leave.status === 'pending' || leave.status === 'approved')) ? (
                              <button
                                type="button"
                                onClick={() => handleCancelLeave(leave._id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                                title="Cancel your leave application if your plans change"
                              >
                                Cancel Leave
                              </button>
                            ) : (
                              leave.reviewComment ? (
                                <span className="text-[11px] text-slate-500 italic" title={leave.reviewComment}>
                                  "{leave.reviewComment}"
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">-</span>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ASSIGNED TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 block">To Do</span>
                  <span className="text-xl font-black text-indigo-700">{facultyTasks.filter(t => t.status === 'todo').length}</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-amber-600 block">In Progress</span>
                  <span className="text-xl font-black text-amber-700">{facultyTasks.filter(t => t.status === 'inprogress').length}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Completed</span>
                  <span className="text-xl font-black text-emerald-700">{facultyTasks.filter(t => t.status === 'completed').length}</span>
                </div>
              </div>

              <div className="space-y-2">
                {facultyTasks.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400">
                    <FiCheckSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No Tasks Assigned Yet</p>
                  </div>
                ) : (
                  facultyTasks.map(task => (
                    <div key={task._id} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{task.title}</h4>
                        {task.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        task.status === 'inprogress' ? 'bg-amber-100 text-amber-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 text-right">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-md"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {reviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 text-center fade-in">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              reviewModal.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {reviewModal.action === 'approved' ? <FiCheck className="w-6 h-6" /> : <FiX className="w-6 h-6" />}
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 mb-1 capitalize">
              {reviewModal.action} Leave Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {profileData?.name} ({reviewModal.leave?.totalDays} Days)
            </p>

            <textarea
              rows="2"
              placeholder="Add optional review comment..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium mb-4 focus:ring-2 focus:ring-orange-400"
            />

            <div className="flex gap-3">
              <button
                onClick={handleReviewAction}
                className={`flex-1 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition ${
                  reviewModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                Confirm {reviewModal.action}
              </button>
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Leave Details Breakdown Popup Modal */}
      {selectedMonthDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto border border-slate-100 p-6 md:p-8 relative fade-in">
            {/* Close Button */}
            <button
              onClick={() => setSelectedMonthDetailsModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer z-10"
            >
              <FiX className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-3 rounded-2xl ${selectedMonthDetailsModal.type === 'current' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                <FiCalendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">
                  {selectedMonthDetailsModal.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Faculty profile: {profileData?.name || 'Faculty'} ({profileData?.department})
                </p>
              </div>
            </div>

            {/* CURRENT MONTH VIEW */}
            {selectedMonthDetailsModal.type === 'current' && (
              <div className="space-y-5">
                {/* Total Days Summary Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-400 shadow-md shadow-orange-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider opacity-90 block">Current Month Taken Leaves</span>
                    <span className="text-2xl font-black">{selectedMonthDetailsModal.totalDaysTaken} Days</span>
                  </div>
                  <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-extrabold border border-white/30">
                    {selectedMonthDetailsModal.monthName} {selectedMonthDetailsModal.year}
                  </div>
                </div>

                {/* 4 Mini Metric Breakdown Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-700">🌴 Casual</span>
                      <span className="text-xs font-extrabold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md">{selectedMonthDetailsModal.casualDays}d</span>
                    </div>
                  </div>
                  <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-700">🤒 Sick</span>
                      <span className="text-xs font-extrabold text-rose-900 bg-rose-200/90 px-2 py-0.5 rounded-md">{selectedMonthDetailsModal.sickDays}d</span>
                    </div>
                  </div>
                  <div className="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-700">🎓 Earned</span>
                      <span className="text-xs font-extrabold text-indigo-900 bg-indigo-200/90 px-2 py-0.5 rounded-md">{selectedMonthDetailsModal.earnedDays}d</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-700">💼 Duty</span>
                      <span className="text-xs font-extrabold text-emerald-900 bg-emerald-200/90 px-2 py-0.5 rounded-md">{selectedMonthDetailsModal.dutyDays}d</span>
                    </div>
                  </div>
                </div>

                {/* Section 1: Leaves Taken This Month */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <FiFileText className="w-4 h-4 text-orange-600" />
                    <span>Leaves Taken In {selectedMonthDetailsModal.monthName} ({selectedMonthDetailsModal.takenLeaves.length})</span>
                  </h4>
                  {selectedMonthDetailsModal.takenLeaves.length > 0 ? (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {selectedMonthDetailsModal.takenLeaves.map((l, idx) => (
                        <div key={l._id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md uppercase tracking-wider ${
                              l.leaveType === 'casual' ? 'bg-amber-100 text-amber-800' :
                              l.leaveType === 'sick' ? 'bg-rose-100 text-rose-800' :
                              l.leaveType === 'earned' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {l.leaveType} Leave
                            </span>
                            <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {l.totalDays || 1} {l.totalDays > 1 ? 'Days' : 'Day'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(l.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {' → '}
                              {new Date(l.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          {l.reason && (
                            <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-100 italic">
                              <strong>Reason:</strong> "{l.reason}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 font-semibold">
                      🎉 No leaves taken so far in {selectedMonthDetailsModal.monthName}!
                    </div>
                  )}
                </div>

                {/* Section 2: Upcoming Scheduled Leaves */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <FiClock className="w-4 h-4 text-indigo-600" />
                    <span>Upcoming Scheduled Leaves ({selectedMonthDetailsModal.upcomingLeaves.length})</span>
                  </h4>
                  {selectedMonthDetailsModal.upcomingLeaves.length > 0 ? (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {selectedMonthDetailsModal.upcomingLeaves.map((l, idx) => (
                        <div key={l._id || idx} className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md uppercase tracking-wider ${
                              l.leaveType === 'casual' ? 'bg-amber-100 text-amber-800' :
                              l.leaveType === 'sick' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {l.leaveType} Leave
                            </span>
                            <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md uppercase tracking-wider ${
                              l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {l.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                            <FiCalendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>
                              {new Date(l.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' → '}
                              {new Date(l.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' '}({l.totalDays || 1} Days)
                            </span>
                          </div>
                          {l.reason && (
                            <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-indigo-100 italic">
                              <strong>Reason:</strong> "{l.reason}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 font-semibold">
                      📅 No upcoming leaves scheduled!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREVIOUS 5-6 MONTHS VIEW */}
            {selectedMonthDetailsModal.type === 'previous' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white border border-indigo-400 shadow-md shadow-indigo-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider opacity-90 block">Past 6 Months Total Approved Leaves</span>
                    <span className="text-2xl font-black">{selectedMonthDetailsModal.grandTotalDays} Days</span>
                  </div>
                  <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-extrabold border border-white/30">
                    6 Months History
                  </div>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {selectedMonthDetailsModal.sixMonthsHistory.map((mObj, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <FiCalendar className="w-4 h-4 text-indigo-600" />
                          {mObj.monthName} {mObj.year}
                        </span>
                        <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-md ${
                          mObj.totalDays > 0 ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {mObj.totalDays} {mObj.totalDays === 1 ? 'Day' : 'Days'} Taken
                        </span>
                      </div>

                      {mObj.leaves.length > 0 ? (
                        <div className="space-y-2">
                          {mObj.leaves.map((l, lIdx) => (
                            <div key={l._id || lIdx} className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">
                                  {l.leaveType} Leave
                                </span>
                                <span className="text-slate-600">
                                  {new Date(l.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} → {new Date(l.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ({l.totalDays || 1}d)
                                </span>
                              </div>
                              {l.reason && (
                                <p className="text-slate-600 italic">
                                  <strong>Reason:</strong> "{l.reason}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                          🎉 100% Attendance (0 Leaves Taken)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Close Button */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedMonthDetailsModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs md:text-sm transition cursor-pointer shadow-md"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyProfileModal;
