import React, { useState, useEffect, useContext } from 'react';
import { taskAPI, leaveAPI } from '../services/api.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { 
  FiPieChart, 
  FiCheckCircle, 
  FiClock, 
  FiTrendingUp, 
  FiList, 
  FiBriefcase, 
  FiUsers, 
  FiFolder,
  FiActivity,
  FiCalendar,
  FiUserCheck,
  FiUserX,
  FiX,
  FiChevronRight,
  FiMessageSquare
} from 'react-icons/fi';

const Dashboard = ({ onFacultyClick, onSelectDepartment }) => {
  const [stats, setStats] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDeptAttendance, setSelectedDeptAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchStats();
    fetchAttendance();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await taskAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data } = await leaveAPI.getDailyAttendance();
      setAttendanceData(data || []);
    } catch (error) {
      console.error('Error fetching daily attendance:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold text-sm">{t('loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  const calculateProgress = (completed, total) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const overallProgress = calculateProgress(stats?.completedTasks, stats?.totalTasks);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiActivity className="w-3.5 h-3.5" />
              Real-Time Metrics
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <FiPieChart className="text-orange-400 w-8 h-8" />
            <span>{t('adminDashboard')}</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">{t('overviewDepartments')}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-white/10 flex items-center gap-4 relative z-10">
          <div>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('overallProgress')}</p>
            <p className="text-2xl md:text-3xl font-extrabold text-white mt-0.5">{overallProgress}%</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin-slow flex items-center justify-center font-bold text-xs text-orange-400">
            <FiTrendingUp className="w-6 h-6 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
              <FiList className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{stats?.totalTasks || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">{t('totalTasks')}</p>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-800 h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* To Do */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FiClock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-indigo-600">{stats?.todoTasks || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">{t('todo')}</p>
          <div className="w-full bg-indigo-50 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${calculateProgress(stats?.todoTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>

        {/* In Progress */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <FiTrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">{stats?.inprogressTasks || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">{t('inProgress')}</p>
          <div className="w-full bg-amber-50 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${calculateProgress(stats?.inprogressTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>

        {/* Completed */}
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Done</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">{stats?.completedTasks || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">{t('completed')}</p>
          <div className="w-full bg-emerald-50 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${calculateProgress(stats?.completedTasks, stats?.totalTasks)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Task Performance Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <h3 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2.5">
            {user?.role === 'hod' ? <FiUsers className="text-orange-500 w-6 h-6" /> : <FiBriefcase className="text-orange-500 w-6 h-6" />}
            <span>{user?.role === 'hod' ? 'Faculty Task Overview' : t('departmentPerformance')}</span>
          </h3>
        </div>

        {user?.role === 'hod' && stats?.facultyStats && stats.facultyStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {stats.facultyStats.map((faculty) => {
              const facultyProgress = calculateProgress(faculty.completed, faculty.total);
              
              return (
                <div 
                  key={faculty._id} 
                  onClick={() => onFacultyClick && onFacultyClick(faculty._id)}
                  className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-200/80 hover:border-orange-400 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-orange-500/20">
                        {faculty.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{faculty.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{faculty.email}</p>
                      </div>
                    </div>
                    <div className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-xs font-extrabold flex-shrink-0">
                      {facultyProgress}%
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs font-semibold">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiList className="w-3.5 h-3.5 text-slate-400" /> {t('total')}</span>
                      <span className="font-extrabold text-slate-800">{faculty.total}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiClock className="w-3.5 h-3.5 text-indigo-500" /> {t('todo')}</span>
                      <span className="font-bold text-indigo-600">{faculty.todo}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiTrendingUp className="w-3.5 h-3.5 text-amber-500" /> {t('progress')}</span>
                      <span className="font-bold text-amber-600">{faculty.inprogress}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Done</span>
                      <span className="font-bold text-emerald-600">{faculty.completed}</span>
                    </div>
                  </div>

                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${facultyProgress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : user?.role === 'admin' && stats?.departmentStats && stats.departmentStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {stats.departmentStats.map((dept) => {
              const deptProgress = calculateProgress(dept.completed, dept.total);
              
              return (
                <div key={dept._id} className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-slate-800 truncate pr-2">{dept._id}</h4>
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-0.5 rounded-full text-xs font-extrabold flex-shrink-0">
                      {deptProgress}%
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs font-semibold">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiList className="w-3.5 h-3.5 text-slate-400" /> {t('total')}</span>
                      <span className="font-extrabold text-slate-800">{dept.total}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiClock className="w-3.5 h-3.5 text-indigo-500" /> {t('todo')}</span>
                      <span className="font-bold text-indigo-600">{dept.todo}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiTrendingUp className="w-3.5 h-3.5 text-amber-500" /> {t('progress')}</span>
                      <span className="font-bold text-amber-600">{dept.inprogress}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5"><FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Done</span>
                      <span className="font-bold text-emerald-600">{dept.completed}</span>
                    </div>
                  </div>

                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${deptProgress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <FiFolder className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold">No department performance data found</p>
          </div>
        )}
      </div>

      {/* 3. DEPARTMENT CLICK MODAL: LEAVE REQUEST FACULTIES & DEPARTMENT LEAVES */}
      {selectedDeptAttendance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto fade-in space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <FiBriefcase className="text-orange-500 w-6 h-6" />
                  <span>{selectedDeptAttendance.department} Department Leaves & Faculty Status</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Leave requests, approval status, and faculty presence details
                </p>
              </div>
              <button
                onClick={() => setSelectedDeptAttendance(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Department Leave Requests Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <FiCalendar className="text-orange-500 w-5 h-5" />
                  <span>Leave Request Faculties ({selectedDeptAttendance.department})</span>
                </h4>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Total {selectedDeptAttendance.leaveRequests?.length || 0} Requests
                </span>
              </div>

              {selectedDeptAttendance.leaveRequests && selectedDeptAttendance.leaveRequests.length > 0 ? (
                <div className="space-y-3">
                  {selectedDeptAttendance.leaveRequests.map((leave) => (
                    <div 
                      key={leave._id}
                      className="glass-card rounded-2xl p-4 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm flex-shrink-0">
                          {leave.applicant?.name?.charAt(0).toUpperCase() || 'F'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-extrabold text-slate-800 text-sm">{leave.applicant?.name || 'Faculty Member'}</h5>
                            <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md uppercase">
                              {leave.leaveType} Leave
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{leave.applicant?.email}</p>
                          <p className="text-xs font-semibold text-slate-600 mt-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            Reason: {leave.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold border w-fit uppercase tracking-wider ${
                          leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          leave.status === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {leave.status}
                        </span>
                        <p className="text-xs font-bold text-slate-500">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.totalDays} Days)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 text-center text-slate-400 border border-slate-100">
                  <FiCalendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">No leave requests found for this department</p>
                </div>
              )}
            </div>

            {/* Department Faculty List & Attendance */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <FiUsers className="text-orange-500 w-5 h-5" />
                <span>Department Faculties Status & Monthly Leaves</span>
              </h4>

              <div className="space-y-3">
                {selectedDeptAttendance.facultyList.map((faculty) => (
                  <div 
                    key={faculty._id}
                    className="glass-card rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-orange-500/20">
                        {faculty.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{faculty.name}</h4>
                        <p className="text-xs text-slate-400">{faculty.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        {faculty.isPresentToday ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full flex items-center gap-1.5 border border-emerald-300">
                            <FiUserCheck className="w-3.5 h-3.5" /> Present Today
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full flex items-center gap-1.5 border border-rose-300">
                            <FiUserX className="w-3.5 h-3.5" /> On Leave ({faculty.activeLeaveToday?.leaveType || 'Absent'})
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Monthly Leaves</span>
                        <span className="text-xs font-extrabold text-slate-800">{faculty.monthlyLeavesTaken} Days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedDeptAttendance(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
