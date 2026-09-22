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
  FiAward
} from 'react-icons/fi';

const FacultyProfileModal = ({ faculty, facultyId, onClose, onRefresh }) => {
  const { user: currentUser } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [facultyLeaves, setFacultyLeaves] = useState([]);
  const [facultyTasks, setFacultyTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('leaves'); // 'leaves' | 'tasks'
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [reviewComment, setReviewComment] = useState('');

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
      const userLeaves = allLeaves.filter(l => 
        (l.applicant?._id === targetId || l.applicant === targetId || (l.applicant?.email && l.applicant?.email === targetEmail))
      );
      setFacultyLeaves(userLeaves);

      const allTasks = tasksRes.data || [];
      const userTasks = allTasks.filter(t => {
        if (!t.assignedTo) return false;
        if (Array.isArray(t.assignedTo)) {
          return t.assignedTo.some(u => (u._id === targetId || u === targetId || u.email === targetEmail));
        }
        return (t.assignedTo._id === targetId || t.assignedTo === targetId || t.assignedTo.email === targetEmail);
      });
      setFacultyTasks(userTasks);

      // Find active today attendance info
      const allDepts = attendanceRes.data || [];
      const deptInfo = allDepts.find(d => d.department === targetDept);
      let activeFacultyItem = null;
      if (deptInfo && deptInfo.facultyList) {
        activeFacultyItem = deptInfo.facultyList.find(f => f._id === targetId || f.email === targetEmail);
      }

      // Calculate leave balances & metrics
      const approvedLeaves = userLeaves.filter(l => l.status === 'approved');
      const casualTaken = approvedLeaves.filter(l => l.leaveType === 'casual').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const sickTaken = approvedLeaves.filter(l => l.leaveType === 'sick').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const earnedTaken = approvedLeaves.filter(l => l.leaveType === 'earned').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
      const dutyTaken = approvedLeaves.filter(l => l.leaveType === 'duty').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

      setProfileData({
        _id: targetId,
        name: activeFacultyItem?.name || targetName,
        email: activeFacultyItem?.email || targetEmail,
        department: targetDept,
        role: targetRole,
        isPresentToday: activeFacultyItem ? activeFacultyItem.isPresentToday : true,
        activeLeaveToday: activeFacultyItem?.activeLeaveToday || null,
        monthlyLeavesTaken: activeFacultyItem?.monthlyLeavesTaken || 0,
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
      fetchFacultyFullDetails();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto fade-in space-y-6">
        {/* Header Profile Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-t-3xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
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

          {/* NAVIGATION TABS (LEAVES vs TASKS) */}
          <div className="flex border-b border-slate-200 gap-6">
            <button
              onClick={() => setActiveTab('leaves')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition ${
                activeTab === 'leaves' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiCalendar className="w-4 h-4" />
              <span>Complete Leave Applications ({facultyLeaves.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 font-extrabold text-sm flex items-center gap-2 border-b-2 transition ${
                activeTab === 'tasks' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiCheckSquare className="w-4 h-4" />
              <span>Assigned Department Tasks ({facultyTasks.length})</span>
            </button>
          </div>

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
    </div>
  );
};

export default FacultyProfileModal;
