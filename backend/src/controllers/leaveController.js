const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { demoLeaves, demoUsers } = require('../utils/mockStore');

exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Start date, end date, and reason are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be earlier than start date' });
    }

    if (mongoose.connection.readyState === 1) {
      const leave = await Leave.create({
        applicant: req.user._id,
        leaveType: leaveType || 'casual',
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        department: req.user.department || 'General',
        status: 'pending'
      });

      const populatedLeave = await Leave.findById(leave._id)
        .populate('applicant', 'name email department role');

      return res.status(201).json(populatedLeave);
    } else {
      const newLeave = {
        _id: '64l' + Date.now().toString(16),
        applicant: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          department: req.user.department || 'General',
          role: req.user.role
        },
        leaveType: leaveType || 'casual',
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        department: req.user.department || 'General',
        status: 'pending',
        createdAt: new Date()
      };

      demoLeaves.unshift(newLeave);
      return res.status(201).json(newLeave);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaves = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let filter = {};
      if (req.user.role === 'admin') {
        filter = {};
      } else if (req.user.role === 'hod') {
        filter = { department: req.user.department };
      } else {
        filter = { applicant: req.user._id };
      }

      const leaves = await Leave.find(filter)
        .populate('applicant', 'name email department role')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 });

      return res.json(leaves);
    } else {
      let filtered = demoLeaves;
      if (req.user.role === 'hod') {
        filtered = demoLeaves.filter(l => l.department === req.user.department);
      } else if (req.user.role === 'user') {
        filtered = demoLeaves.filter(l => l.applicant._id === req.user._id);
      }
      return res.json(filtered);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected' });
    }

    if (mongoose.connection.readyState === 1) {
      const leave = await Leave.findById(id);
      if (!leave) return res.status(404).json({ message: 'Leave request not found' });

      if (req.user.role !== 'admin' && (req.user.role !== 'hod' || leave.department !== req.user.department)) {
        return res.status(403).json({ message: 'Access denied to review this leave' });
      }

      leave.status = status;
      leave.reviewComment = reviewComment || (status === 'approved' ? 'Approved' : 'Rejected');
      leave.reviewedBy = req.user._id;
      leave.reviewedAt = new Date();

      await leave.save();
      const updated = await Leave.findById(id)
        .populate('applicant', 'name email department role')
        .populate('reviewedBy', 'name email');

      return res.json(updated);
    } else {
      const leave = demoLeaves.find(l => l._id === id);
      if (!leave) return res.status(404).json({ message: 'Leave request not found' });

      leave.status = status;
      leave.reviewComment = reviewComment || (status === 'approved' ? 'Approved' : 'Rejected');
      leave.reviewedBy = { _id: req.user._id, name: req.user.name, email: req.user.email };
      leave.reviewedAt = new Date();

      return res.json(leave);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let filter = {};
      if (req.user.role === 'hod') {
        filter = { department: req.user.department };
      } else if (req.user.role === 'user') {
        filter = { applicant: req.user._id };
      }

      const totalLeaves = await Leave.countDocuments(filter);
      const pendingLeaves = await Leave.countDocuments({ ...filter, status: 'pending' });
      const approvedLeaves = await Leave.countDocuments({ ...filter, status: 'approved' });
      const rejectedLeaves = await Leave.countDocuments({ ...filter, status: 'rejected' });

      const userDoc = await User.findById(req.user._id);
      const leaveBalance = userDoc?.leaveBalance || { casual: 12, sick: 10, earned: 15 };

      return res.json({
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        leaveBalance
      });
    } else {
      let filtered = demoLeaves;
      if (req.user.role === 'hod') {
        filtered = demoLeaves.filter(l => l.department === req.user.department);
      } else if (req.user.role === 'user') {
        filtered = demoLeaves.filter(l => l.applicant._id === req.user._id);
      }

      const userObj = demoUsers.find(u => u._id === req.user._id) || demoUsers[3];
      const leaveBalance = userObj.leaveBalance || { casual: 12, sick: 10, earned: 15 };

      return res.json({
        totalLeaves: filtered.length,
        pendingLeaves: filtered.filter(l => l.status === 'pending').length,
        approvedLeaves: filtered.filter(l => l.status === 'approved').length,
        rejectedLeaves: filtered.filter(l => l.status === 'rejected').length,
        leaveBalance
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDailyAttendance = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    if (mongoose.connection.readyState === 1) {
      const users = await User.find({ role: { $ne: 'admin' } }).select('name email department role');
      const activeLeavesToday = await Leave.find({
        status: 'approved',
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday }
      }).populate('applicant', '_id name email department');

      const monthLeaves = await Leave.find({
        status: 'approved',
        startDate: { $gte: startOfMonth },
        endDate: { $lte: endOfMonth }
      });

      const allLeaves = await Leave.find().populate('applicant', 'name email department role');

      const activeUserIdsToday = new Set(activeLeavesToday.map(l => l.applicant._id.toString()));
      const departmentMap = {};

      users.forEach(u => {
        const dept = u.department || 'General';
        if (!departmentMap[dept]) {
          departmentMap[dept] = {
            department: dept,
            totalFaculty: 0,
            presentCount: 0,
            absentCount: 0,
            presentList: [],
            absentList: [],
            facultyList: [],
            leaveRequests: []
          };
        }

        const isAbsentToday = activeUserIdsToday.has(u._id.toString());
        const activeLeave = activeLeavesToday.find(l => l.applicant._id.toString() === u._id.toString());
        
        const userMonthLeaves = monthLeaves.filter(l => l.applicant.toString() === u._id.toString());
        const monthlyDays = userMonthLeaves.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

        const facultyItem = {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isPresentToday: !isAbsentToday,
          activeLeaveToday: isAbsentToday ? {
            leaveType: activeLeave?.leaveType,
            reason: activeLeave?.reason,
            startDate: activeLeave?.startDate,
            endDate: activeLeave?.endDate
          } : null,
          monthlyLeavesTaken: monthlyDays
        };

        departmentMap[dept].totalFaculty += 1;
        departmentMap[dept].facultyList.push(facultyItem);

        if (isAbsentToday) {
          departmentMap[dept].absentCount += 1;
          departmentMap[dept].absentList.push(facultyItem);
        } else {
          departmentMap[dept].presentCount += 1;
          departmentMap[dept].presentList.push(facultyItem);
        }
      });

      allLeaves.forEach(l => {
        const dept = l.department || l.applicant?.department || 'General';
        if (departmentMap[dept]) {
          departmentMap[dept].leaveRequests.push(l);
        }
      });

      return res.json(Object.values(departmentMap));
    } else {
      // Mock code mode
      const departmentMap = {};

      demoUsers.filter(u => u.role !== 'admin').forEach(u => {
        const dept = u.department || 'General';
        if (!departmentMap[dept]) {
          departmentMap[dept] = {
            department: dept,
            totalFaculty: 0,
            presentCount: 0,
            absentCount: 0,
            presentList: [],
            absentList: [],
            facultyList: [],
            leaveRequests: []
          };
        }

        const activeLeave = demoLeaves.find(l => 
          l.applicant._id === u._id && 
          l.status === 'approved' &&
          new Date(l.startDate) <= endOfToday &&
          new Date(l.endDate) >= startOfToday
        );

        const isAbsentToday = !!activeLeave;
        const userMonthLeaves = demoLeaves.filter(l => l.applicant._id === u._id && l.status === 'approved');
        const monthlyDays = userMonthLeaves.reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

        const facultyItem = {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isPresentToday: !isAbsentToday,
          activeLeaveToday: activeLeave ? {
            leaveType: activeLeave.leaveType,
            reason: activeLeave.reason,
            startDate: activeLeave.startDate,
            endDate: activeLeave.endDate
          } : null,
          monthlyLeavesTaken: monthlyDays
        };

        departmentMap[dept].totalFaculty += 1;
        departmentMap[dept].facultyList.push(facultyItem);

        if (isAbsentToday) {
          departmentMap[dept].absentCount += 1;
          departmentMap[dept].absentList.push(facultyItem);
        } else {
          departmentMap[dept].presentCount += 1;
          departmentMap[dept].presentList.push(facultyItem);
        }
      });

      demoLeaves.forEach(l => {
        const dept = l.department || l.applicant?.department || 'General';
        if (departmentMap[dept]) {
          departmentMap[dept].leaveRequests.push(l);
        }
      });

      return res.json(Object.values(departmentMap));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const leave = await Leave.findOne({ _id: id, applicant: req.user._id, status: 'pending' });
      if (!leave) return res.status(404).json({ message: 'Pending leave request not found' });
      leave.status = 'cancelled';
      await leave.save();
      return res.json({ message: 'Leave cancelled successfully' });
    } else {
      const leaveIndex = demoLeaves.findIndex(l => l._id === id && l.applicant._id === req.user._id);
      if (leaveIndex === -1) return res.status(404).json({ message: 'Pending leave request not found' });
      demoLeaves[leaveIndex].status = 'cancelled';
      return res.json({ message: 'Leave cancelled successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
