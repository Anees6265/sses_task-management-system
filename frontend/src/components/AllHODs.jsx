import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../services/api.jsx';
import { toast } from 'react-toastify';

const AllHODs = ({ onSelectDepartment }) => {
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <span className="text-2xl md:text-4xl">👨‍💼</span>
          <span>All Heads of Departments (HODs)</span>
        </h2>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          Comprehensive overview of all HODs, their department assignments, faculty headcount, and task statistics.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="🔍 Search HOD by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs md:text-sm">
            <span className="text-gray-600 font-medium">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="all">All Departments</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs md:text-sm">
            <span className="text-gray-600 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
            <p className="text-sm">Loading HODs list...</p>
          </div>
        ) : filteredHods.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">👨‍💼</p>
            <p className="text-lg font-medium text-gray-600">No HODs found</p>
            <p className="text-xs text-gray-500 mt-1">Try changing search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">HOD Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Faculty Count</th>
                  <th className="py-3 px-4 text-center">Total Tasks</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredHods.map((hod) => (
                  <tr key={hod._id} className="hover:bg-orange-50/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {hod.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{hod.name}</div>
                          <div className="text-xs text-gray-500">{hod.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md border border-orange-200 text-xs">
                        🏛️ {hod.departmentName || hod.department || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                      {hod.facultyCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                      {hod.totalTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-green-600">
                      {hod.completedTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                      {hod.pendingTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-red-600">
                      {hod.overdueTasks || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        hod.departmentStatus === 'active'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {hod.departmentStatus === 'active' ? 'Active' : 'Inactive'}
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
