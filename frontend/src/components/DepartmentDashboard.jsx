import React, { useState, useEffect, useContext } from 'react';
import { leaveAPI, taskAPI } from '../services/api.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { 
  FiBriefcase, 
  FiUsers, 
  FiUserCheck, 
  FiUserX, 
  FiCalendar, 
  FiChevronRight, 
  FiClock, 
  FiSearch,
  FiFilter,
  FiActivity
} from 'react-icons/fi';

const DepartmentDashboard = ({ onSelectDepartment }) => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceRes, leavesRes] = await Promise.all([
        leaveAPI.getDailyAttendance(),
        leaveAPI.getLeaves()
      ]);
      setAttendanceData(attendanceRes.data || []);
      setLeaves(leavesRes.data || []);
    } catch (error) {
      console.error('Error fetching department dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = attendanceData.filter(dept => 
    dept.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold text-sm">Loading Department Dashboard...</p>
        </div>
      </div>
    );
  }

  const totalFacultyCount = attendanceData.reduce((acc, d) => acc + d.totalFaculty, 0);
  const totalPresentCount = attendanceData.reduce((acc, d) => acc + d.presentCount, 0);
  const totalAbsentCount = attendanceData.reduce((acc, d) => acc + d.absentCount, 0);

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiBriefcase className="w-3.5 h-3.5" />
              Department Directory
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <span>Department Dashboard</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Overview of all departments, daily faculty attendance ratios & leave request counts
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-4 relative z-10">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-slate-300 tracking-wider">Total Departments</p>
            <p className="text-2xl font-black text-white">{attendanceData.length} Active</p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FiBriefcase className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase">Departments</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{attendanceData.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Total Active Departments</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
              <FiUsers className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Staff</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{totalFacultyCount}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Total Institute Faculties</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiUserCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase">Present</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">{totalPresentCount}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Present Today Across Institute</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <FiUserX className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-rose-500 uppercase">On Leave</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-rose-600">{totalAbsentCount}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">On Leave Today Across Institute</p>
        </div>
      </div>

      {/* Main Department Cards Grid */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
              <FiBriefcase className="text-orange-500 w-6 h-6" />
              <span>All Departments Directory</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Click any department card to view its complete faculty attendance list, leaves & tasks
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const deptLeaves = leaves.filter(l => l.department === dept.department || l.applicant?.department === dept.department);

            return (
              <div
                key={dept.department}
                onClick={() => onSelectDepartment(dept.department)}
                className="glass-card glass-card-hover rounded-2xl p-6 border border-slate-200/80 hover:border-orange-500 cursor-pointer transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                        {dept.department.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition-colors">
                          {dept.department}
                        </h4>
                        <p className="text-xs font-semibold text-slate-400">{dept.totalFaculty} Total Faculties</p>
                      </div>
                    </div>
                    <span className="p-2 bg-slate-100 group-hover:bg-orange-500 text-slate-400 group-hover:text-white rounded-xl transition">
                      <FiChevronRight className="w-5 h-5" />
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center my-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Leaves</span>
                      <span className="text-lg font-black text-slate-800">{deptLeaves.length}</span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">Present</span>
                      <span className="text-lg font-black text-emerald-700">{dept.presentCount}</span>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                      <span className="text-[10px] font-extrabold text-rose-600 uppercase block">On Leave</span>
                      <span className="text-lg font-black text-rose-700">{dept.absentCount}</span>
                    </div>
                  </div>

                  {/* Presence Ratio Progress Bar */}
                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden flex mb-4">
                    <div 
                      className="bg-emerald-500 h-full transition-all" 
                      style={{ width: `${(dept.presentCount / (dept.totalFaculty || 1)) * 100}%` }}
                    />
                    <div 
                      className="bg-rose-500 h-full transition-all" 
                      style={{ width: `${(dept.absentCount / (dept.totalFaculty || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-orange-600">
                  <span>View Full Department Details</span>
                  <span className="flex items-center gap-1">
                    Details ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboard;
