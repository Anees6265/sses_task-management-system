import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI, taskAPI, userAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { toast } from 'react-toastify';
import FacultyProfileModal from './FacultyProfileModal.jsx';
import { 
  FiArrowLeft, 
  FiBriefcase, 
  FiUsers, 
  FiUserCheck, 
  FiUserX, 
  FiCalendar, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiList, 
  FiSearch, 
  FiFilter, 
  FiCheck, 
  FiX,
  FiTrendingUp,
  FiAlertCircle,
  FiPhone
} from 'react-icons/fi';

const DepartmentDetailPage = ({ departmentName, onBack, onOpenFacultyProfile }) => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [deptData, setDeptData] = useState(null);
  const [deptLeaves, setDeptLeaves] = useState([]);
  const [deptTasks, setDeptTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');
  const [selectedFacultyProfile, setSelectedFacultyProfile] = useState(null);

  const isAdmin = user?.role === 'admin';
  const activeDeptName = (!isAdmin && user?.department) ? user.department : departmentName;

  useEffect(() => {
    fetchDepartmentDetail();
  }, [departmentName, user]);

  const fetchDepartmentDetail = async () => {
    setLoading(true);
    try {
      const targetDept = activeDeptName;
      const [attendanceRes, leavesRes, tasksRes] = await Promise.all([
        leaveAPI.getDailyAttendance(),
        leaveAPI.getLeaves(),
        taskAPI.getTasks()
      ]);

      const allDepts = attendanceRes.data || [];
      const foundDept = allDepts.find(d => d.department === targetDept) || {
        department: targetDept,
        totalFaculty: 0,
        presentCount: 0,
        absentCount: 0,
        presentList: [],
        absentList: [],
        facultyList: [],
        leaveRequests: []
      };
      setDeptData(foundDept);

      const allLeaves = leavesRes.data || [];
      const filteredLeaves = allLeaves.filter(l => l.department === targetDept || l.applicant?.department === targetDept);
      setDeptLeaves(filteredLeaves);

      const allTasks = tasksRes.data || [];
      const filteredTasks = allTasks.filter(t => t.department === targetDept);
      setDeptTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching department details:', error);
      toast.error('Failed to load department details');
    } finally {
      setLoading(false);
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
      fetchDepartmentDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    }
  };

  const filteredLeavesList = deptLeaves.filter(leave => {
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    const applicantName = leave.applicant?.name || '';
    const matchesSearch = applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
      case 'pending': return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-amber-300"><FiClock className="w-3 h-3" /> Pending</span>;
      case 'approved': return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-emerald-300"><FiCheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected': return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full flex items-center gap-1 border border-rose-300"><FiXCircle className="w-3 h-3" /> Rejected</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full flex items-center gap-1 border border-slate-300">Cancelled</span>;
      default: return null;
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header Banner with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 transition backdrop-blur-md active:scale-95"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="pt-2">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30">
              Department Portal
            </span>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mt-1 flex items-center gap-3">
              <FiBriefcase className="text-orange-400 w-8 h-8" />
              <span>{activeDeptName} Department</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Complete faculty attendance, active leave applications & department task performance
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4 relative z-10">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">Total Department Staff</p>
            <p className="text-2xl font-black text-white">{deptData?.totalFaculty || 0} Members</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
              <FiUsers className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Staff</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{deptData?.totalFaculty || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Total Faculties</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiUserCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase">Present</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">{deptData?.presentCount || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Present Today</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <FiUserX className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-rose-500 uppercase">On Leave</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-rose-600">{deptData?.absentCount || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">On Leave Today</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <FiCalendar className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-500 uppercase">Requests</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">{deptLeaves.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Total Leave Applications</p>
        </div>
      </div>

      {/* SECTION 1: DEDICATED BLOCK FOR PENDING LEAVE REQUESTS (ACTION NEEDED) */}
      {deptLeaves.filter(l => l.status === 'pending').length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/90 to-amber-50/90 rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs">
                  Action Required
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
                <FiClock className="text-amber-600 w-6 h-6" />
                <span>Pending Faculty Leave Requests ({deptLeaves.filter(l => l.status === 'pending').length})</span>
              </h3>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Faculty members waiting for HOD / Admin leave approval
              </p>
            </div>

            <span className="px-3.5 py-1.5 bg-white text-amber-800 text-xs font-extrabold rounded-xl border border-amber-300 shadow-xs w-fit">
              {deptLeaves.filter(l => l.status === 'pending').length} Pending Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deptLeaves.filter(l => l.status === 'pending').map((leave) => (
              <div 
                key={leave._id}
                className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
                      {leave.applicant?.name?.charAt(0).toUpperCase() || 'F'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{leave.applicant?.name || 'Faculty Member'}</h4>
                      <p className="text-xs text-slate-500">{leave.applicant?.email}</p>
                      {leave.applicant?.phoneNumber && (
                        <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                          <FiPhone className="w-3 h-3" />
                          <span>{leave.applicant.phoneNumber}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {getLeaveTypeBadge(leave.leaveType)}
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {leave.totalDays} {leave.totalDays > 1 ? 'Days' : 'Day'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <p className="font-bold text-slate-800 mb-0.5">Reason for Request:</p>
                  <p className="italic">"{leave.reason}"</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1">
                    <FiCalendar className="w-3.5 h-3.5 text-amber-600" />
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </p>
                </div>

                {canReviewLeave(leave) && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setReviewModal({ leave, action: 'approved' })}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <FiCheck className="w-4 h-4" /> Approve Leave
                    </button>
                    <button
                      onClick={() => setReviewModal({ leave, action: 'rejected' })}
                      className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <FiX className="w-4 h-4" /> Reject Leave
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: PRESENT FACULTIES TODAY TABLE */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
              <FiUserCheck className="text-emerald-500 w-6 h-6" />
              <span>Present Faculties Today ({deptData?.presentCount || 0})</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              List of faculty members on active duty today in {departmentName}
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full border border-emerald-200">
            🟢 Active On Duty
          </span>
        </div>

        <div className="overflow-x-auto">
          {deptData?.presentList && deptData.presentList.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Faculty Member</th>
                  <th className="p-3.5">Role / Designation</th>
                  <th className="p-3.5">Today Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Monthly Leaves Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {deptData.presentList.map((faculty) => (
                  <tr 
                    key={faculty._id} 
                    onClick={() => onOpenFacultyProfile ? onOpenFacultyProfile(faculty) : setSelectedFacultyProfile(faculty)}
                    className="hover:bg-emerald-50/50 transition cursor-pointer"
                    title="Click to view complete faculty profile & leave info"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-xs shadow-md shadow-emerald-500/20">
                          {faculty.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 leading-tight group-hover:text-orange-600">{faculty.name}</p>
                          <p className="text-[11px] text-slate-400">{faculty.email}</p>
                          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                            <FiPhone className="w-3 h-3 text-emerald-500" />
                            <span>{faculty.phoneNumber || 'No phone set'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 uppercase text-xs font-bold text-slate-600">{faculty.role}</td>
                    <td className="p-3.5">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full inline-flex items-center gap-1 border border-emerald-300">
                        <FiCheck className="w-3.5 h-3.5" /> Present Today
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 font-extrabold rounded-xl border border-slate-200 text-xs">
                        {faculty.monthlyLeavesTaken || 0} Days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-6 text-center text-slate-400">
              <p className="text-xs font-semibold">No faculty present today in this department.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: ON LEAVE FACULTIES TODAY TABLE */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
              <FiUserX className="text-rose-500 w-6 h-6" />
              <span>On Leave Faculties Today ({deptData?.absentCount || 0})</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Faculty members absent or on approved leave today in {departmentName}
            </p>
          </div>
          <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-full border border-rose-200">
            🔴 Approved Leave
          </span>
        </div>

        <div className="overflow-x-auto">
          {deptData?.absentList && deptData.absentList.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Faculty Member</th>
                  <th className="p-3.5">Leave Type</th>
                  <th className="p-3.5">Leave Reason</th>
                  <th className="p-3.5">Today Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Monthly Leaves Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {deptData.absentList.map((faculty) => (
                  <tr 
                    key={faculty._id} 
                    onClick={() => onOpenFacultyProfile ? onOpenFacultyProfile(faculty) : setSelectedFacultyProfile(faculty)}
                    className="hover:bg-rose-50/50 transition cursor-pointer"
                    title="Click to view complete faculty profile & leave info"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-extrabold flex items-center justify-center text-xs shadow-md shadow-rose-500/20">
                          {faculty.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 leading-tight">{faculty.name}</p>
                          <p className="text-[11px] text-slate-400">{faculty.email}</p>
                          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                            <FiPhone className="w-3 h-3 text-emerald-500" />
                            <span>{faculty.phoneNumber || 'No phone set'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {getLeaveTypeBadge(faculty.activeLeaveToday?.leaveType || 'casual')}
                    </td>
                    <td className="p-3.5 text-xs text-slate-600 italic max-w-xs truncate">
                      "{faculty.activeLeaveToday?.reason || 'No details provided'}"
                    </td>
                    <td className="p-3.5">
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full inline-flex items-center gap-1 border border-rose-300">
                        <FiX className="w-3.5 h-3.5" /> On Leave Today
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 font-extrabold rounded-xl border border-slate-200 text-xs">
                        {faculty.monthlyLeavesTaken || 0} Days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-6 text-center">
              <FiCheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-extrabold text-emerald-800">100% Full Attendance Today!</p>
              <p className="text-xs text-emerald-600 mt-0.5">No faculty members are on leave in {departmentName} today.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: DEPARTMENT LEAVE APPLICATIONS & HISTORY TABLE */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
              <FiCalendar className="text-orange-500 w-6 h-6" />
              <span>Department Leave Applications & History</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Manage and review all leave applications for {departmentName}
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
                placeholder="Search leave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          {filteredLeavesList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FiCalendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Leave Applications Found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 rounded-l-2xl">Applicant Faculty</th>
                  <th className="p-3.5">Leave Type</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Days</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredLeavesList.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs">
                          {leave.applicant?.name?.charAt(0).toUpperCase() || 'F'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{leave.applicant?.name || 'Faculty Member'}</p>
                          <p className="text-[11px] text-slate-400">{leave.applicant?.email}</p>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal (HOD / Admin Approval Dialog) */}
      {reviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 text-center fade-in">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              reviewModal.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {reviewModal.action === 'approved' ? <FiCheck className="w-6 h-6" /> : <FiX className="w-6 h-6" />}
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 mb-1 capitalize">
              {reviewModal.action} Leave Application
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Applicant: <span className="font-bold text-slate-700">{reviewModal.leave?.applicant?.name}</span> ({reviewModal.leave?.totalDays} Days)
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

      {/* Faculty Profile Modal */}
      {selectedFacultyProfile && (
        <FacultyProfileModal
          faculty={selectedFacultyProfile}
          onClose={() => setSelectedFacultyProfile(null)}
          onRefresh={fetchDepartmentDetail}
        />
      )}
    </div>
  );
};

export default DepartmentDetailPage;
