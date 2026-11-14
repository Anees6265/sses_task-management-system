import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../services/api.jsx';
import { toast } from 'react-toastify';
import Loader from './Loader.jsx';
import { 
  FiUserCheck, 
  FiUsers, 
  FiBriefcase, 
  FiSearch, 
  FiFilter, 
  FiCheckCircle, 
  FiPower, 
  FiClock, 
  FiShield, 
  FiChevronRight,
  FiAlertCircle
} from 'react-icons/fi';

const AllHODs = ({ onSelectDepartment, onOpenFacultyProfile }) => {
  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    fetchHODs();
    fetchDepartmentsList();
  }, [deptFilter, statusFilter]);

  const fetchHODs = async () => {
    setLoading(true);
    try {
      const { data } = await departmentAPI.getAllHODs({
        department: deptFilter,
        status: statusFilter
      });
      setHods(data || []);
    } catch (error) {
      console.error('Error fetching HODs:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch HODs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentsList = async () => {
    try {
      const { data } = await departmentAPI.getAllDepartments({ simple: 'true' });
      setDepartmentsList(data || []);
    } catch (error) {
      console.error('Error fetching departments list:', error);
    }
  };

  const filteredHods = hods.filter(h => 
    h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-3 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
              <FiUserCheck className="w-3.5 h-3.5" />
              Sant Singaji Educational Society — Departmental Leadership
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>Heads of Department (HOD) Directorate</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Executive directory of appointed department chairpersons overseeing academic curriculum execution, instructional faculty allocation, and institutional milestone compliance.
          </p>
        </div>

        <div className="relative z-10">
          <span className="px-4 py-2 bg-white/10 text-orange-300 text-xs font-bold rounded-2xl border border-white/20 backdrop-blur-md flex items-center gap-2">
            <FiShield className="w-4 h-4 text-orange-400" />
            <span>Academic Leadership Council</span>
          </span>
        </div>
      </div>

      {/* Leadership Stats Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
              <FiUserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">Chairpersons</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{hods.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Appointed HODs</p>
          <span className="text-[10px] text-slate-400">Total departmental leaders</span>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Active Status</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">
            {hods.filter(h => h.departmentStatus === 'active').length}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Academic Leaders</p>
          <span className="text-[10px] text-slate-400">Operating departments</span>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FiUsers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Faculty Body</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {hods.reduce((acc, h) => acc + (h.facultyCount || 0), 0)}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Supervised Faculty</p>
          <span className="text-[10px] text-slate-400">Teaching personnel</span>
        </div>

        <div className="glass-card glass-card-hover rounded-3xl p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Deliverables</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">
            {hods.reduce((acc, h) => acc + (h.totalTasks || 0), 0)}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Total Assigned Tasks</p>
          <span className="text-[10px] text-slate-400">Academic deliverables</span>
        </div>
      </div>


      {/* Search & Filter Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search HOD name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-extrabold uppercase tracking-wider">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="all">All Departments</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-extrabold uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <Loader message="Loading HOD Leadership Roster..." inline />
        ) : filteredHods.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <FiUserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Heads of Department Found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or department filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 rounded-l-2xl">Appointed HOD</th>
                  <th className="py-3.5 px-4">Supervised Department</th>
                  <th className="py-3.5 px-4 text-center">Faculty Count</th>
                  <th className="py-3.5 px-4 text-center">Assigned Tasks</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4 text-center">Overdue</th>
                  <th className="py-3.5 px-4 text-center rounded-r-2xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium text-slate-700">
                {filteredHods.map((hod) => (
                  <tr key={hod._id} className="hover:bg-slate-50/80 transition">
                    <td 
                      className="py-3.5 px-4 cursor-pointer group"
                      onClick={() => onOpenFacultyProfile && onOpenFacultyProfile(hod)}
                      title="Click to view complete faculty & leadership profile"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-full flex items-center justify-center text-white font-black text-xs group-hover:scale-105 transition shadow-sm">
                          {hod.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-orange-600 transition flex items-center gap-2">
                            <span>{hod.name}</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">Profile</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{hod.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <span className="bg-orange-50 text-orange-800 px-3 py-1 rounded-xl border border-orange-200 text-xs font-bold inline-flex items-center gap-1.5">
                        <FiBriefcase className="w-3.5 h-3.5 text-orange-500" />
                        {hod.departmentName || hod.department || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {hod.facultyCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                      {hod.totalTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {hod.completedTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                      {hod.pendingTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-rose-600">
                      {hod.overdueTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${
                        hod.departmentStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {hod.departmentStatus === 'active' ? <><FiCheckCircle className="w-3 h-3" /> Active</> : <><FiPower className="w-3 h-3" /> Inactive</>}
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
  );
};

export default AllHODs;
