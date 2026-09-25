const mongoose = require('mongoose');
const User = require('../models/User');
const { demoUsers } = require('../utils/mockStore');

exports.getAllUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const filter = (req.user.role === 'admin' || req.user.role === 'hod')
        ? (req.user.role === 'admin' ? {} : { department: req.user.department })
        : { department: req.user.department };
      const users = await User.find(filter).select('name email department role phoneNumber');
      return res.json(users);
    }
  } catch (error) {
    console.error('❌ User search error, serving from Mock Store:', error.message);
  }

  let filtered = demoUsers;
  if (req.user.role === 'hod') {
    filtered = demoUsers.filter(u => u.department === req.user.department);
  }
  return res.json(filtered.map(u => ({ 
    _id: u._id, 
    name: u.name, 
    email: u.email, 
    department: u.department, 
    role: u.role, 
    phoneNumber: u.phoneNumber 
  })));
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const userId = req.user._id;

    if (mongoose.connection.readyState === 1) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { 
            ...(name && { name: name.trim() }), 
            ...(phoneNumber !== undefined && { phoneNumber: phoneNumber.trim() }) 
          },
          { new: true, runValidators: true }
        ).select('name email department role phoneNumber');

        if (updatedUser) {
          const demoIndex = demoUsers.findIndex(u => String(u._id) === String(userId));
          if (demoIndex !== -1) {
            if (name) demoUsers[demoIndex].name = name.trim();
            if (phoneNumber !== undefined) demoUsers[demoIndex].phoneNumber = phoneNumber.trim();
          }
          return res.json(updatedUser);
        }
      } catch (dbErr) {
        console.warn('DB update failed, updating mock store:', dbErr.message);
      }
    }

    const demoIndex = demoUsers.findIndex(u => String(u._id) === String(userId));
    if (demoIndex !== -1) {
      if (name) demoUsers[demoIndex].name = name.trim();
      if (phoneNumber !== undefined) demoUsers[demoIndex].phoneNumber = phoneNumber.trim();
      return res.json(demoUsers[demoIndex]);
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({ message: 'Department is required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin can change user department' });
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          id,
          { department },
          { new: true, runValidators: true }
        ).select('name email department role phoneNumber');

        if (updatedUser) {
          const demoIndex = demoUsers.findIndex(u => String(u._id) === String(id));
          if (demoIndex !== -1) {
            demoUsers[demoIndex].department = department;
          }
          return res.json(updatedUser);
        }
      } catch (dbErr) {
        console.warn('DB update failed, updating mock store:', dbErr.message);
      }
    }

    const demoIndex = demoUsers.findIndex(u => String(u._id) === String(id));
    if (demoIndex !== -1) {
      demoUsers[demoIndex].department = department;
      return res.json(demoUsers[demoIndex]);
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
