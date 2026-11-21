import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI, taskAPI, userAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import { notifyDataRefresh } from '../utils/eventBus.js';
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
  FiPhone,
  FiTrendingUp,
  FiExternalLink,
  FiShield,
  FiPieChart,
  FiChevronLeft,
  FiChevronRight,
  FiUsers
} from 'react-icons/fi';

const FacultyProfileModal = ({ faculty, targetUser, facultyId, onClose, onRefresh }) => {
  const { user: currentUser } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [facultyLeaves, setFacultyLeaves] = useState([]);
  const [facultyTasks, setFacultyTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'leaves' | 'tasks'
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');

  // Month navigation for day-by-day attendance calendar
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);

  // Scope-based absence tracking: Admin sees SSES institution total; HOD & Faculty see their department
  const [scopeAbsenceLeaves, setScopeAbsenceLeaves] = useState([]);
  const [scopeTotalFaculties, setScopeTotalFaculties] = useState(0);
  const [scopeLabel, setScopeLabel] = useState('');

  // Analytics popup modal ('current' | 'previous' | null)
  const [analyticsModalMonth, setAnalyticsModalMonth] = useState(null);

  useEffect(() => {
    fetchFacultyFullDetails();

    const handleRefresh = () => {
      fetchFacultyFullDetails();
    };
    window.addEventListener('app_data_refresh', handleRefresh);
    return () => {
      window.removeEventListener('app_data_refresh', handleRefresh);
    };
  }, [faculty, targetUser, facultyId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (analyticsModalMonth) {
          setAnalyticsModalMonth(null);
        } else if (reviewModal) {
          setReviewModal(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, analyticsModalMonth, reviewModal]);

  const fetchFacultyFullDetails = async () => {
    setLoading(true);
    try {
      const rawTarget = faculty || targetUser || {};
      const initialTarget = Array.isArray(rawTarget) ? (rawTarget[0] || {}) : (typeof rawTarget === 'object' ? rawTarget : {});
      const targetId = initialTarget._id || facultyId || (typeof rawTarget === 'string' ? rawTarget : currentUser?._id);

      const initialName = initialTarget?.name || (targetId === currentUser?._id ? currentUser?.name : '');
      const initialEmail = initialTarget?.email || (targetId === currentUser?._id ? currentUser?.email : '');
      const initialDept = initialTarget?.department || (targetId === currentUser?._id ? currentUser?.department : '');
      const initialRole = initialTarget?.role || (targetId === currentUser?._id ? currentUser?.role : 'user');
      const initialPhone = initialTarget?.phoneNumber || (targetId === currentUser?._id ? currentUser?.phoneNumber : '');

      // Set fallback/initial profile data immediately so UI never shows blank or 'F'
      const fallbackProfile = {
        _id: targetId,
        name: initialName || 'Faculty Member',
        email: initialEmail || '',
        department: initialDept || 'General',
        role: initialRole || 'user',
        phoneNumber: initialPhone || '',
        isPresentToday: true,
        activeLeaveToday: null,
        monthlyLeavesTaken: 0,
        lastMonthLeavesTaken: 0,
        quota: {
          casual: { used: 0, total: 12, balance: 12 },
          sick: { used: 0, total: 10, balance: 10 },
          earned: { used: 0, total: 15, balance: 15 },
          duty: { taken: 0 }
        }
      };
      setProfileData(prev => prev || fallbackProfile);

      // Attempt to fetch full user info if viewing another user or missing fields
      let fetchedUser = null;
      if (targetId && targetId !== currentUser?._id && typeof targetId === 'string' && targetId.length === 24) {
        try {
          const userRes = await userAPI.getUserById(targetId);
          if (userRes?.data) {
            fetchedUser = userRes.data;
          }
        } catch (err) {
          console.warn('Could not fetch user by ID:', err.message);
        }
      }

      const effectiveUser = fetchedUser ? { ...initialTarget, ...fetchedUser } : initialTarget;
      const targetName = effectiveUser?.name || initialName || (targetId === currentUser?._id ? currentUser?.name : 'Faculty Member');
      const targetEmail = effectiveUser?.email || initialEmail || (targetId === currentUser?._id ? currentUser?.email : '');
      const targetDept = effectiveUser?.department || initialDept || (targetId === currentUser?._id ? currentUser?.department : 'General');
      const targetRole = effectiveUser?.role || initialRole || (targetId === currentUser?._id ? currentUser?.role : 'user');
      const targetPhone = effectiveUser?.phoneNumber || initialPhone || (targetId === currentUser?._id ? currentUser?.phoneNumber : '');

      // Scope for absence count: Admin sees institution-wide total; HOD & Faculty see their department
      const isAdmin = currentUser?.role === 'admin';
      const userDept = currentUser?.department || targetDept;
      const deptScope = isAdmin ? undefined : userDept;

      // Use Promise.allSettled with fallbacks so a failure in any single sub-service never breaks profile viewing
      const [leavesSettled, tasksSettled, attendanceSettled, scopeLeavesSettled] = await Promise.allSettled([
        leaveAPI.getLeaves({ includePast: 'true', userId: targetId }),
        (currentUser?.role === 'admin' || currentUser?.role === 'hod' || currentUser?._id === targetId)
          ? taskAPI.getTasksByFaculty(targetId).catch(() => taskAPI.getTasks().catch(() => ({ data: [] })))
          : taskAPI.getTasks().catch(() => ({ data: [] })),
        leaveAPI.getDailyAttendance(),
        leaveAPI.getLeaves({ includePast: 'true', scope: 'calendar_absences', department: deptScope })
      ]);

      const leavesRes = leavesSettled.status === 'fulfilled' ? leavesSettled.value : { data: [] };
      const tasksRes = tasksSettled.status === 'fulfilled' ? tasksSettled.value : { data: [] };
      const attendanceRes = attendanceSettled.status === 'fulfilled' ? attendanceSettled.value : { data: [] };
      const scopeLeavesRes = scopeLeavesSettled.status === 'fulfilled' ? scopeLeavesSettled.value : { data: [] };

      const allLeaves = Array.isArray(leavesRes?.data) ? leavesRes.data : [];
      const userLeaves = allLeaves.filter(l => {
        if (!l) return false;
        const applicantId = String(l.applicant?._id || l.applicant || '');
        const applicantEmail = l.applicant?.email;
        return (targetId && applicantId === String(targetId)) ||
               (targetEmail && applicantEmail && applicantEmail.toLowerCase() === targetEmail.toLowerCase());
      });
      setFacultyLeaves(userLeaves);

      // Process scope absence leaves (approved only)
      const rawScopeLeaves = Array.isArray(scopeLeavesRes?.data) ? scopeLeavesRes.data : [];
      const approvedScopeLeaves = rawScopeLeaves.filter(l => l && l.status === 'approved');
      setScopeAbsenceLeaves(approvedScopeLeaves);

      const allTasks = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
      const userTasks = allTasks.filter(t => {
        if (!t || !t.assignedTo) return false;
        if (Array.isArray(t.assignedTo)) {
          return t.assignedTo.some(u => {
            const uId = String(u?._id || u || '');
            const uEmail = u?.email;
            return (targetId && uId === String(targetId)) ||
                   (targetEmail && uEmail && uEmail.toLowerCase() === targetEmail.toLowerCase());
          });
        }
        const aId = String(t.assignedTo?._id || t.assignedTo || '');
        const aEmail = t.assignedTo?.email;
        return (targetId && aId === String(targetId)) ||
               (targetEmail && aEmail && aEmail.toLowerCase() === targetEmail.toLowerCase());
      });
      setFacultyTasks(userTasks);

      // Find active today attendance info across departments & compute total faculties in scope
      const allDepts = Array.isArray(attendanceRes?.data) ? attendanceRes.data : [];
      let totalFacultyCount = 0;
      let label = '';

      if (isAdmin) {
        totalFacultyCount = allDepts.reduce((acc, curr) => {
          return acc + (curr?.totalFaculty || (Array.isArray(curr?.facultyList) ? curr.facultyList.length : 0));
        }, 0);
        label = 'SSES Total Faculties (All Depts)';
      } else {
        const currentDeptInfo = allDepts.find(d => 
          d && d.department && userDept && d.department.trim().toLowerCase() === userDept.trim().toLowerCase()
        );
        totalFacultyCount = currentDeptInfo?.totalFaculty || (Array.isArray(currentDeptInfo?.facultyList) ? currentDeptInfo.facultyList.length : 0);
        label = `${userDept || 'Department'} Faculties`;
      }

      // Fallback if department or allDepts has not populated yet
      if (totalFacultyCount === 0) {
        totalFacultyCount = isAdmin ? 45 : 12;
      }
      setScopeTotalFaculties(totalFacultyCount);
      setScopeLabel(label);
      const deptInfo = allDepts.find(d => 
        d && d.department && targetDept && d.department.trim().toLowerCase() === targetDept.trim().toLowerCase()
      );
      let activeFacultyItem = null;
      if (deptInfo && Array.isArray(deptInfo.facultyList)) {
        activeFacultyItem = deptInfo.facultyList.find(f => 
          (targetId && String(f._id) === String(targetId)) ||
          (targetEmail && f.email && f.email.trim().toLowerCase() === targetEmail.trim().toLowerCase())
        );
      }
      if (!activeFacultyItem) {
        for (const d of allDepts) {
          if (Array.isArray(d?.facultyList)) {
            const found = d.facultyList.find(f => 
              (targetId && String(f._id) === String(targetId)) ||
              (targetEmail && f.email && f.email.trim().toLowerCase() === targetEmail.trim().toLowerCase())
            );
            if (found) {
              activeFacultyItem = found;
              break;
            }
          }
        }
      }

      // Calculate leave balances & metrics
      const approvedLeaves = userLeaves.filter(l => l && l.status === 'approved');
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
        if (!l.startDate) return false;
        const d = new Date(l.startDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      const currentMonthDays = currentMonthLeavesList.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

      const lastMonthLeavesList = approvedLeaves.filter(l => {
        if (!l.startDate) return false;
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
        phoneNumber: targetPhone || activeFacultyItem?.phoneNumber || '',
        isPresentToday: activeFacultyItem ? (activeFacultyItem.isPresentToday !== false) : true,
        activeLeaveToday: activeFacultyItem?.activeLeaveToday || null,
        monthlyLeavesTaken: activeFacultyItem?.monthlyLeavesTaken || currentMonthDays,
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
      // Fallback data is preserved so user never gets broken profile
    } finally {
      setLoading(false);
    }
  };

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
      notifyDataRefresh('leaves');
      setReviewModal(null);
      setReviewComment('');
      fetchFacultyFullDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
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

    const approvedLeaves = facultyLeaves.filter(l => l.status === 'approved');

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);

      const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dayDate.getDay() === 0;
      const isFuture = dayDate.getTime() > today.getTime();
      const isToday = dayDate.getTime() === today.getTime();

      // Check if faculty has approved leave covering this day
      const activeLeaveOnDay = approvedLeaves.find(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate || l.startDate);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return dayDate >= start && dayDate <= end;
      });

      // Calculate faculties absent in scope on this calendar day:
      // Admin -> all departments total SSES faculties absent
      // HOD & Faculty -> faculties absent in their department
      const scopeLeavesOnDay = scopeAbsenceLeaves.filter(l => {
        if (!l.startDate) return false;
        const start = new Date(l.startDate);
        const end = new Date(l.endDate || l.startDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return dayDate >= start && dayDate <= end;
      });

      const absentFacultyMap = new Map();
      scopeLeavesOnDay.forEach(l => {
        const fId = String(l.applicant?._id || l.applicant || l.applicant?.email || '');
        if (fId && !absentFacultyMap.has(fId)) {
          absentFacultyMap.set(fId, {
            id: fId,
            name: l.applicant?.name || 'Faculty Member',
            email: l.applicant?.email || '',
            department: l.department || l.applicant?.department || '',
            leaveType: l.leaveType || 'Leave',
            reason: l.reason || ''
          });
        }
      });

      const absentFaculties = Array.from(absentFacultyMap.values());
      const absentCount = absentFaculties.length;

      daysArray.push({
        dayNumber: day,
        dateString: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dayOfWeek,
        isSunday,
        isFuture,
        isToday,
        isLeave: !!activeLeaveOnDay,
        leaveDetails: activeLeaveOnDay || null,
        absentCount,
        absentFaculties
      });
    }

    return { monthName, daysArray, totalDaysInMonth, firstDayOfWeek, year, month };
  };

  const currentMonthMatrix = buildMonthDateMatrix();

  // Calculate rich statistics for any month offset (0 = current month, -1 = last month)
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
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto fade-in space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profile Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 sm:p-6 md:p-8 rounded-t-3xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <button
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
                <h2 className="text-xl md:text-2xl font-black text-white capitalize">{profileData?.name}</h2>
                <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-extrabold rounded-full border border-orange-500/30 uppercase tracking-wider">
                  {profileData?.role === 'hod' ? 'HOD' : 'Faculty Member'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 flex items-center gap-2">
                <FiMail className="w-4 h-4 text-orange-400" />
                <span>{profileData?.email}</span>
              </p>
              {profileData?.phoneNumber && (
                <p className="text-xs md:text-sm text-emerald-400 flex items-center gap-2">
                  <FiPhone className="w-4 h-4 text-emerald-400" />
                  <span>{profileData.phoneNumber}</span>
                </p>
              )}
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <FiBriefcase className="w-4 h-4 text-amber-400" />
                <span className="capitalize">{profileData?.department} Department</span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2 relative z-10 min-w-[200px]">
            <p className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">Today's Duty Status</p>
            {profileData?.isPresentToday !== false ? (
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

        <div className="p-4 sm:p-6 md:p-8 space-y-6 pt-0">
          {/* SECTION 1: LEAVE QUOTA BALANCES & SUMMARY */}
          <div>
            <h3 className="text-base font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <FiAward className="text-orange-500 w-5 h-5" />
              <span>Faculty Leave Quotas & Yearly Balances</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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

              {/* CURRENT MONTH LEAVES */}
              <div 
                onClick={() => setAnalyticsModalMonth('current')}
                className="glass-card rounded-2xl p-4 border border-amber-200/80 bg-amber-50/30 hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
                title="Click to view detailed monthly leave analytics"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-600 uppercase block mb-1">Monthly Leaves Taken</span>
                  <FiExternalLink className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl md:text-2xl font-black text-amber-700">
                    {currentStats.leavesTaken} <span className="text-xs font-bold text-slate-400">Days</span>
                  </p>
                  {currentStats.isZeroLeaves && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      100% Duty
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mt-2">Approved leaves this month</p>
                <p className="text-[10px] text-amber-700 font-bold mt-1 group-hover:underline">View Analytics ↗</p>
              </div>

              {/* NEXT MONTH LEAVES (UPCOMING FORECAST) */}
              <div 
                onClick={() => setAnalyticsModalMonth('next')}
                className="glass-card rounded-2xl p-4 border border-emerald-200/80 bg-emerald-50/30 hover:border-emerald-400 hover:shadow-md transition cursor-pointer group"
                title="Click to view detailed next month scheduled leaves & forecast"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase block mb-1">Next Month Leaves</span>
                  <FiExternalLink className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl md:text-2xl font-black text-emerald-800">
                    {nextMonthStats.leavesTaken} <span className="text-xs font-bold text-slate-400">Days</span>
                  </p>
                  {nextMonthStats.isZeroLeaves ? (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      0 Leaves
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                      Scheduled
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mt-2">Scheduled for {nextMonthStats.shortMonth}</p>
                <p className="text-[10px] text-emerald-700 font-bold mt-1 group-hover:underline">View Forecast ↗</p>
              </div>
            </div>

            {/* SECTION: 3-MONTH COMPARISON & FORECAST */}
            <div className="pt-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <FiTrendingUp className="text-indigo-600 w-4 h-4" />
                  <span>Previous, Current & Next Month Leave Comparison</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full w-fit">
                  Click cards for popup analytics
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. PREVIOUS MONTH */}
                <div 
                  onClick={() => setAnalyticsModalMonth('previous')}
                  className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100/60 p-4 rounded-2xl border border-indigo-200/90 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                      <FiClock className="w-3 h-3 text-indigo-500" />
                      Previous Month ({lastMonthStats.shortMonth})
                    </span>
                    <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1">
                      <span>Analytics</span>
                      <FiExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-indigo-900">{lastMonthStats.leavesTaken} Days</p>
                    {lastMonthStats.isZeroLeaves && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        ⭐ Clean Record
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Approved leave count in previous month</p>
                  <div className="mt-3 pt-2.5 border-t border-indigo-200/70 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Duty Present</span>
                      <span className="font-black text-slate-800">{lastMonthStats.daysPresent} / {lastMonthStats.workingDays}</span>
                      <span className="text-[9px] text-emerald-700 font-bold block">({lastMonthStats.attendanceRate}% Rate)</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Quota Intact</span>
                      <span className="font-black text-slate-800">{lastMonthStats.preservedQuotas} / 37</span>
                      <span className="text-[9px] text-indigo-700 font-bold block">(Past Record)</span>
                    </div>
                  </div>
                </div>

                {/* 2. CURRENT MONTH */}
                <div 
                  onClick={() => setAnalyticsModalMonth('current')}
                  className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 p-4 rounded-2xl border border-orange-200/90 hover:border-orange-400 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                      Current Month ({currentStats.shortMonth})
                    </span>
                    <span className="text-[10px] font-extrabold text-orange-600 bg-orange-100 group-hover:bg-orange-500 group-hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1">
                      <span>Analytics</span>
                      <FiExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-slate-900">{currentStats.leavesTaken} Days</p>
                    {currentStats.isZeroLeaves && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        ⭐ 100% Duty
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Approved leave count in current active month</p>
                  <div className="mt-3 pt-2.5 border-t border-orange-200/70 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Duty Present</span>
                      <span className="font-black text-slate-800">{currentStats.daysPresent} / {currentStats.workingDays}</span>
                      <span className="text-[9px] text-emerald-700 font-bold block">({currentStats.attendanceRate}% Rate)</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Quota Intact</span>
                      <span className="font-black text-slate-800">{currentStats.preservedQuotas} / 37</span>
                      <span className="text-[9px] text-indigo-700 font-bold block">(100% Left)</span>
                    </div>
                  </div>
                </div>

                {/* 3. NEXT MONTH (UPCOMING FORECAST) */}
                <div 
                  onClick={() => setAnalyticsModalMonth('next')}
                  className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 p-4 rounded-2xl border border-emerald-200/90 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <FiCalendar className="w-3 h-3 text-emerald-600" />
                      Next Month ({nextMonthStats.shortMonth})
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white px-2 py-0.5 rounded-full transition-all flex items-center gap-1">
                      <span>Forecast</span>
                      <FiExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-emerald-950">{nextMonthStats.leavesTaken} Days</p>
                    {nextMonthStats.isZeroLeaves ? (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        ⭐ 0 Scheduled
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        📅 Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Scheduled leaves in upcoming month</p>
                  <div className="mt-3 pt-2.5 border-t border-emerald-200/70 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Projected Duty</span>
                      <span className="font-black text-slate-800">{nextMonthStats.daysPresent} / {nextMonthStats.workingDays}</span>
                      <span className="text-[9px] text-emerald-700 font-bold block">({nextMonthStats.attendanceRate}% Proj.)</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Quota Intact</span>
                      <span className="font-black text-slate-800">{nextMonthStats.preservedQuotas} / 37</span>
                      <span className="text-[9px] text-indigo-700 font-bold block">(Available)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trajectory Strip */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <FiShield className="text-indigo-600 w-4 h-4 flex-shrink-0" />
                  <span>
                    3-Month View: Past ({lastMonthStats.leavesTaken} d) • Current ({currentStats.leavesTaken} d) • Next Month ({nextMonthStats.leavesTaken} d scheduled)
                  </span>
                </div>
                <button
                  onClick={() => setAnalyticsModalMonth('next2')}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <span>Forecast {nextNextMonthStats.shortMonth} (+2)</span>
                  <FiChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
          </div>

          {/* NAVIGATION TABS (CALENDAR vs LEAVES vs TASKS) */}
          <div className="flex border-b border-slate-200 gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
                activeTab === 'calendar' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiCalendar className="w-4 h-4" />
              <span>Monthly Attendance Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
                activeTab === 'leaves' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiClock className="w-4 h-4" />
              <span>Complete Leave Applications ({facultyLeaves.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
                activeTab === 'tasks' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiCheckSquare className="w-4 h-4" />
              <span>Assigned Department Tasks ({facultyTasks.length})</span>
            </button>
          </div>

          {/* TAB 0: MONTHLY ATTENDANCE CALENDAR WITH RIGHT-SIDE BOTTOM DAILY ABSENCES */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              {/* Calendar Controls & Month Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <FiCalendar className="text-orange-500 w-5 h-5" />
                    <span>{currentMonthMatrix.monthName}</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Complete day-by-day status from Day 1 to Day {currentMonthMatrix.totalDaysInMonth}
                  </p>
                </div>

                {/* Month Selector Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedMonthOffset(prev => prev - 1)}
                    className="p-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-xs"
                    title="Previous Month"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSelectedMonthOffset(-1)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                      selectedMonthOffset === -1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Last Month</span>
                  </button>

                  <button
                    onClick={() => setSelectedMonthOffset(0)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                      selectedMonthOffset === 0 ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>This Month</span>
                  </button>

                  <button
                    onClick={() => setSelectedMonthOffset(1)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                      selectedMonthOffset === 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Next Month</span>
                  </button>

                  <button
                    onClick={() => setSelectedMonthOffset(prev => prev + 1)}
                    className="p-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-xs"
                    title="Next Month"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Legend & Summary Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-600 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 inline-block shadow-xs"></span>
                    Present / Active Duty
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-rose-500 inline-block shadow-xs"></span>
                    On Approved Leave
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-amber-200 border border-amber-400 inline-block"></span>
                    Sunday
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300 inline-block"></span>
                    Upcoming
                  </span>
                </div>

                {/* Scope Absence Notice */}
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                  <span>Right-Bottom Badge: {currentUser?.role === 'admin' ? `SSES Total Absent Count (${scopeTotalFaculties} Faculties)` : `${scopeLabel || 'Department'} Absent Count (${scopeTotalFaculties} Faculties)`}</span>
                </div>
              </div>

              {/* 7-COLUMN CALENDAR (SCROLLABLE ON MOBILE) */}
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[620px] md:min-w-0 space-y-2">
                  {/* 7-COLUMN WEEKDAY HEADERS */}
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
                    {/* Padding cells */}
                    {Array.from({ length: currentMonthMatrix.firstDayOfWeek }).map((_, i) => (
                      <div key={`padding-${i}`} className="bg-slate-50/40 rounded-2xl p-2.5 border border-slate-100/60 opacity-30 min-h-[85px]" />
                    ))}

                    {/* Date Cells */}
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
                          className={`rounded-2xl p-2.5 border transition-all flex flex-col justify-between min-h-[92px] relative group ${cardStyle} ${
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

                          {/* RIGHT-SIDE BOTTOM: Absence indicator for Admin (SSES Total) & HOD/Faculty (Department) */}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 flex items-center justify-between gap-1 text-[10px]">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter truncate max-w-[45px] sm:max-w-none">
                              {currentUser?.role === 'admin' ? 'Total' : 'Dept'}
                            </span>
                            <span 
                              className={`ml-auto font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs transition-all cursor-help ${
                                day.absentCount > 0
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-1 ring-rose-400/40'
                                  : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                              }`}
                              title={
                                day.absentCount > 0
                                  ? `${day.absentCount} of ${scopeTotalFaculties} ${currentUser?.role === 'admin' ? 'SSES faculties' : (profileData?.department || 'department faculties')} absent on ${day.dateString}:\n${day.absentFaculties.map(f => `• ${f.name} (${f.department}) - ${f.leaveType}`).join('\n')}`
                                  : `All ${scopeTotalFaculties} ${currentUser?.role === 'admin' ? 'SSES' : (profileData?.department || 'department')} faculties on duty (0 absent)`
                              }
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${day.absentCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-emerald-500'}`} />
                              <span className="text-[10px] font-black">{day.absentCount} absent</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DAILY ABSENCE TRACKER - RIGHT SIDE BOTTOM OF CALENDAR */}
              {(() => {
                const daysWithAbsences = currentMonthMatrix.daysArray.filter(d => !d.isSunday && d.absentCount > 0);
                const totalAbsentInstances = daysWithAbsences.reduce((acc, d) => acc + d.absentCount, 0);
                const perfectDaysCount = currentMonthMatrix.daysArray.filter(d => !d.isSunday && d.absentCount === 0 && !d.isFuture).length;

                return (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black shadow-xs">
                          <FiUsers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <span>Daily Absence Tracker</span>
                            <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                              {currentMonthMatrix.monthName}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            {currentUser?.role === 'admin' 
                              ? `Institution-wide total faculties absent day-by-day (All SSES Departments • ${scopeTotalFaculties} Total Faculties)`
                              : `${profileData?.department || currentUser?.department || 'Department'} faculty absences day-by-day (${scopeTotalFaculties} Total Faculties)`
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="text-[11px] font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                          {currentUser?.role === 'admin' ? 'SSES Admin View' : 'Department View'}
                        </span>
                        <span className={`text-[11px] font-black px-3 py-1 rounded-xl border ${
                          daysWithAbsences.length > 0 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {daysWithAbsences.length} {daysWithAbsences.length === 1 ? 'Day with Absences' : 'Days with Absences'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Metrics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Total Faculties In Scope</span>
                        <p className="text-xl font-black text-slate-800 mt-0.5">{scopeTotalFaculties}</p>
                        <span className="text-[10px] text-slate-500 font-bold block">{currentUser?.role === 'admin' ? 'SSES Total' : (profileData?.department || 'Department')}</span>
                      </div>
                      <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3">
                        <span className="text-[10px] font-black uppercase text-rose-600 block">Days with Absences</span>
                        <p className="text-xl font-black text-rose-700 mt-0.5">{daysWithAbsences.length} <span className="text-xs font-bold text-rose-500">Days</span></p>
                        <span className="text-[10px] text-rose-600 font-bold block">{currentMonthMatrix.monthName}</span>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3">
                        <span className="text-[10px] font-black uppercase text-amber-700 block">Total Absent Instances</span>
                        <p className="text-xl font-black text-amber-800 mt-0.5">{totalAbsentInstances} <span className="text-xs font-bold text-amber-600">Absences</span></p>
                        <span className="text-[10px] text-amber-700 font-bold block">Across recorded days</span>
                      </div>
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3">
                        <span className="text-[10px] font-black uppercase text-emerald-700 block">100% Duty Days</span>
                        <p className="text-xl font-black text-emerald-800 mt-0.5">{perfectDaysCount} <span className="text-xs font-bold text-emerald-600">Days</span></p>
                        <span className="text-[10px] text-emerald-700 font-bold block">Zero absences recorded</span>
                      </div>
                    </div>

                    {/* Day-by-Day Absences List */}
                    {daysWithAbsences.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                          <span>Days with Faculty Absences ({daysWithAbsences.length}):</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {daysWithAbsences.map(day => (
                            <div 
                              key={day.dayNumber}
                              className="bg-white rounded-2xl p-3.5 border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all shadow-2xs group flex flex-col justify-between space-y-2"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                                <div>
                                  <span className="text-xs font-black text-slate-900 block">{day.dateString}</span>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{day.dayOfWeek}</span>
                                </div>
                                <span className="px-2.5 py-1 bg-rose-600 text-white rounded-xl text-xs font-black shadow-2xs flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                  <span>{day.absentCount} {day.absentCount === 1 ? 'Faculty' : 'Faculties'}</span>
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Absent Faculty List:</p>
                                <div className="space-y-1 max-h-28 overflow-y-auto no-scrollbar">
                                  {day.absentFaculties.map((f, fIdx) => (
                                    <div key={fIdx} className="bg-rose-50/60 p-1.5 rounded-lg border border-rose-100/80 text-[11px] leading-tight">
                                      <p className="font-extrabold text-rose-950 truncate">{f.name}</p>
                                      <p className="text-[10px] text-rose-700 font-medium truncate flex items-center justify-between">
                                        <span>{f.department}</span>
                                        <span className="font-bold capitalize">{f.leaveType}</span>
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 text-center">
                        <p className="text-xs font-black text-emerald-900 flex items-center justify-center gap-2">
                          <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Clean Attendance Record: Zero faculties were absent on any working day in {currentMonthMatrix.monthName}!</span>
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          {currentUser?.role === 'admin'
                            ? `All ${scopeTotalFaculties} SSES faculties across all departments were on active duty.`
                            : `All ${scopeTotalFaculties} faculties in ${profileData?.department || currentUser?.department} department were on active duty.`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 1: COMPLETE LEAVE HISTORY */}
          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'all' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    All ({facultyLeaves.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'pending' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Pending ({facultyLeaves.filter(l => l.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1 rounded-xl transition ${statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    Approved ({facultyLeaves.filter(l => l.status === 'approved').length})
                  </button>
                  <button
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
                              </div>
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

          {/* TAB 2: ASSIGNED TASKS */}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl my-auto border border-slate-100 text-center fade-in">
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
      {/* Comprehensive Monthly Leave & Attendance Analytics Popup Modal */}
      {analyticsModalMonth && (
        <div 
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[90] p-3 sm:p-6 overflow-y-auto"
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
                  className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                  title="Close (Esc)"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Month Switcher Tabs inside Popup */}
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                <span className="text-xs font-bold text-slate-400 mr-1">Select Month:</span>
                
                {/* Step Backward */}
                <button
                  onClick={() => setAnalyticsModalMonth(modalOffset - 1)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-slate-300 hover:bg-white/20 transition flex items-center gap-1"
                  title="Previous month"
                >
                  <FiChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <button
                  onClick={() => setAnalyticsModalMonth('previous')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                    modalOffset === 2
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  Following ({nextNextMonthStats.shortMonth})
                </button>

                {/* Step Forward */}
                <button
                  onClick={() => setAnalyticsModalMonth(modalOffset + 1)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-slate-300 hover:bg-white/20 transition flex items-center gap-1"
                  title="Next month"
                >
                  <span>Next</span>
                  <FiChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Faculty Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-sm">
                    {profileData?.name?.charAt(0) || 'F'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{profileData?.name}</h4>
                    <p className="text-xs text-slate-500 capitalize">{profileData?.department} Department • {profileData?.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${
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
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    {modalOffset > 0 ? 'Available Quota' : 'Quota Preserved'}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    {activeModalStats.preservedQuotas} <span className="text-xs font-bold text-slate-400">/ 37</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {modalOffset > 0 ? 'Projected leave balance' : 'Institutional quota intact'}
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
                    <span className="text-[10px] font-black text-amber-700 uppercase block mb-1">Duty Leave (OD)</span>
                    <p className="text-lg font-black text-slate-900">{activeModalStats.odTaken} <span className="text-xs text-slate-500 font-bold">Days</span></p>
                    <div className="w-full bg-amber-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: activeModalStats.odTaken > 0 ? '100%' : '0%' }} />
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 block mt-1">Official Duty / Seminars</span>
                  </div>
                </div>
              </div>

              {/* 3-Month Comparative Performance Panel */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <FiTrendingUp className="text-indigo-600 w-4 h-4" />
                  <span>3-Month Comparative Performance & Trajectory</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Previous */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-200/60 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Previous ({lastMonthStats.shortMonth})</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-600 font-bold">Leaves Deducted:</span>
                      <span className="font-black text-slate-900 text-sm">{lastMonthStats.leavesTaken} Days</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-600 font-bold">Duty Attendance:</span>
                      <span className="font-black text-emerald-600 text-sm">{lastMonthStats.attendanceRate}%</span>
                    </div>
                  </div>

                  {/* Current */}
                  <div className="bg-white p-3 rounded-xl border border-orange-200/60 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-orange-600 block">Current ({currentStats.shortMonth})</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-600 font-bold">Leaves Deducted:</span>
                      <span className="font-black text-slate-900 text-sm">{currentStats.leavesTaken} Days</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-600 font-bold">Duty Attendance:</span>
                      <span className="font-black text-emerald-600 text-sm">{currentStats.attendanceRate}%</span>
                    </div>
                  </div>

                  {/* Next */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Next Month ({nextMonthStats.shortMonth})</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-600 font-bold">Scheduled Leaves:</span>
                      <span className="font-black text-slate-900 text-sm">{nextMonthStats.leavesTaken} Days</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-600 font-bold">Projected Duty:</span>
                      <span className="font-black text-emerald-600 text-sm">{nextMonthStats.attendanceRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/70 p-2.5 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <FiCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Continuous Academic Attendance: High institutional presence verified across previous, current, and upcoming academic periods.
                  </span>
                </div>
              </div>

              {/* Monthly Leave Applications History / Duty Verification */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <FiCalendar className="text-slate-500 w-4 h-4" />
                  <span>Leave Records Filed for {activeModalStats.monthName}</span>
                </h4>

                {activeModalStats.monthLeaves.length === 0 ? (
                  <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-2xl p-6 text-center text-slate-600">
                    <FiShield className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-extrabold text-slate-900">
                      {modalOffset > 0 ? `No Advance Leaves Scheduled for ${activeModalStats.monthName}` : `No Leave Applications on File for ${activeModalStats.monthName}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {modalOffset > 0 
                        ? `The faculty member has no advance leaves or absences registered for ${activeModalStats.monthName}. Full 100% duty attendance projected.`
                        : `The faculty member had 100% uninterrupted active attendance across all ${activeModalStats.workingDays} working days in ${activeModalStats.monthName}. No leaves were requested or approved.`}
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
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition text-xs shadow-sm"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyProfileModal;
