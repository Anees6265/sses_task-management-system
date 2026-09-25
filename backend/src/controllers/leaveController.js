const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { demoLeaves, demoUsers } = require('../utils/mockStore');
const { sendLeaveNotificationToReviewer, sendLeaveStatusNotificationToApplicant } = require('../services/whatsappService');

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

    let resultLeave = null;

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

      resultLeave = await Leave.findById(leave._id)
        .populate('applicant', 'name email department role phoneNumber');
    } else {
      const newLeave = {
        _id: '64l' + Date.now().toString(16),
        applicant: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          department: req.user.department || 'General',
          role: req.user.role,
          phoneNumber: req.user.phoneNumber
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
      resultLeave = newLeave;
    }

    // Trigger WhatsApp notification asynchronously (Faculty -> HOD, HOD -> Admin)
    (async () => {
      try {
        let reviewer = null;
        if (req.user.role === 'user') {
          // Faculty applied -> notify HOD of faculty's department
          if (mongoose.connection.readyState === 1) {
            reviewer = await User.findOne({ role: 'hod', department: req.user.department });
          } else {
            reviewer = demoUsers.find(u => u.role === 'hod' && u.department === req.user.department);
          }
        } else if (req.user.role === 'hod') {
          // HOD applied -> notify Admin
          if (mongoose.connection.readyState === 1) {
            reviewer = await User.findOne({ role: 'admin' });
          } else {
            reviewer = demoUsers.find(u => u.role === 'admin');
          }
        }

        if (reviewer && reviewer.phoneNumber) {
          await sendLeaveNotificationToReviewer({
            reviewerPhone: reviewer.phoneNumber,
            reviewerName: reviewer.name,
            applicantName: req.user.name,
            applicantRole: req.user.role,
            department: req.user.department || 'General',
            leaveType: leaveType || 'casual',
            startDate: start,
            endDate: end,
            totalDays,
            reason
          });
        } else {
          console.log(`ℹ️ WhatsApp notification skipped: Reviewer (${reviewer ? reviewer.name : 'HOD/Admin'}) does not have a phone number.`);
        }
      } catch (wErr) {
        console.error('⚠️ Error processing WhatsApp leave application notification:', wErr.message);
      }
    })();

    return res.status(201).json(resultLeave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaves = async (req, res) => {
  try {
    let mongoLeaves = [];
    if (mongoose.connection.readyState === 1) {
      let filter = {};
      if (req.user.role === 'admin') {
        filter = {};
      } else if (req.user.role === 'hod') {
        filter = { department: req.user.department };
      } else {
        filter = { applicant: req.user._id };
      }

      mongoLeaves = await Leave.find(filter)
        .populate('applicant', 'name email department role phoneNumber')
        .populate('reviewedBy', 'name email phoneNumber')
        .sort({ createdAt: -1 });
    }

    if (mongoLeaves && mongoLeaves.length > 0) {
      return res.json(mongoLeaves);
    }

    let filtered = demoLeaves;
    if (req.user.role === 'hod') {
      filtered = demoLeaves.filter(l => l.department === req.user.department);
    } else if (req.user.role === 'user') {
      filtered = demoLeaves.filter(l => 
        (l.applicant?._id === req.user._id) || (l.applicant === req.user._id) || (l.applicant?.email === req.user.email)
      );
    }
    return res.json(filtered);
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

    let leave = null;
    let isMongoDoc = false;

    if (mongoose.connection.readyState === 1) {
      try {
        leave = await Leave.findById(id);
        if (leave) isMongoDoc = true;
      } catch (err) {
        console.warn('MongoDB findById failed, checking demo store:', err.message);
      }
    }

    if (!leave) {
      leave = demoLeaves.find(l => l._id.toString() === id.toString());
    }

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const applicantId = typeof leave.applicant === 'object' 
      ? (leave.applicant?._id ? leave.applicant._id.toString() : '') 
      : (leave.applicant ? leave.applicant.toString() : '');
    const applicantEmail = typeof leave.applicant === 'object' ? leave.applicant?.email : '';

    const isSelfLeave = (applicantId && applicantId === req.user._id.toString()) || 
                        (applicantEmail && applicantEmail === req.user.email);

    if (req.user.role === 'user') {
      return res.status(403).json({ message: 'Faculty members cannot review leave requests' });
    }

    if (req.user.role === 'hod') {
      if (isSelfLeave) {
        return res.status(403).json({ message: 'HOD cannot approve their own leave request. Only Admin can review HOD leaves.' });
      }
      if (leave.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only review leaves for your department.' });
      }
    }

    let updatedResult = null;

    if (isMongoDoc) {
      leave.status = status;
      leave.reviewComment = reviewComment || (status === 'approved' ? 'Approved' : 'Rejected');
      leave.reviewedBy = req.user._id;
      leave.reviewedAt = new Date();

      await leave.save();
      updatedResult = await Leave.findById(id)
        .populate('applicant', 'name email department role phoneNumber')
        .populate('reviewedBy', 'name email phoneNumber');
    } else {
      leave.status = status;
      leave.reviewComment = reviewComment || (status === 'approved' ? 'Approved' : 'Rejected');
      leave.reviewedBy = { _id: req.user._id, name: req.user.name, email: req.user.email };
      leave.reviewedAt = new Date();
      updatedResult = leave;
    }

    // Trigger WhatsApp notification asynchronously to the Applicant (Faculty / HOD)
    (async () => {
      try {
        let applicantUser = null;
        if (mongoose.connection.readyState === 1 && applicantId) {
          applicantUser = await User.findById(applicantId);
        }
        
        if (!applicantUser) {
          applicantUser = demoUsers.find(u => String(u._id) === String(applicantId) || (applicantEmail && u.email === applicantEmail));
        }

        if (!applicantUser && typeof leave.applicant === 'object') {
          applicantUser = leave.applicant;
        }

        if (applicantUser && applicantUser.phoneNumber) {
          await sendLeaveStatusNotificationToApplicant({
            applicantPhone: applicantUser.phoneNumber,
            applicantName: applicantUser.name,
            status,
            reviewerName: req.user.name,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: leave.totalDays,
            reviewComment: leave.reviewComment
          });
        } else {
          console.log(`ℹ️ WhatsApp status notification skipped: Applicant (${applicantUser?.name || 'User'}) does not have a phone number.`);
        }
      } catch (wErr) {
        console.error('⚠️ Error processing WhatsApp status update notification:', wErr.message);
      }
    })();

    return res.json(updatedResult);
  } catch (error) {
    console.error('Error in updateLeaveStatus:', error);
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
      const users = await User.find({ role: { $ne: 'admin' } }).select('name email department role phoneNumber');
      const activeLeavesToday = await Leave.find({
        status: 'approved',
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday }
      }).populate('applicant', '_id name email department phoneNumber');

      const monthLeaves = await Leave.find({
        status: 'approved',
        startDate: { $gte: startOfMonth },
        endDate: { $lte: endOfMonth }
      });

      const allLeaves = await Leave.find().populate('applicant', 'name email department role phoneNumber');

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
          phoneNumber: u.phoneNumber,
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
          phoneNumber: u.phoneNumber,
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

    let leave = null;
    if (mongoose.connection.readyState === 1) {
      try {
        leave = await Leave.findOne({ 
          _id: id, 
          applicant: req.user._id,
          status: { $in: ['pending', 'approved'] }
        });
      } catch (err) {
        console.warn('MongoDB cancel query error, checking demo store:', err.message);
      }
    }

    if (leave) {
      leave.status = 'cancelled';
      await leave.save();
      return res.json({ message: 'Leave request cancelled successfully' });
    } else {
      const index = demoLeaves.findIndex(l => 
        (String(l._id) === String(id)) && 
        (l.applicant?._id === req.user._id || l.applicant === req.user._id || l.applicant?.email === req.user.email) &&
        (l.status === 'pending' || l.status === 'approved')
      );

      if (index !== -1) {
        demoLeaves[index].status = 'cancelled';
        return res.json({ message: 'Leave request cancelled successfully' });
      }

      return res.status(404).json({ message: 'Active or pending leave request not found to cancel' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
