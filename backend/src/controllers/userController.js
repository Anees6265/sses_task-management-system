const mongoose = require('mongoose');
const User = require('../models/User');
const { demoUsers } = require('../utils/mockStore');

exports.getAllUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const filter = (req.user.role === 'admin' || req.user.role === 'hod')
        ? (req.user.role === 'admin' ? {} : { department: req.user.department })
        : { department: req.user.department };
      const users = await User.find(filter).select('name email department role');
      return res.json(users);
    } else {
      let filtered = demoUsers;
      if (req.user.role === 'hod') {
        filtered = demoUsers.filter(u => u.department === req.user.department);
      }
      return res.json(filtered.map(u => ({ _id: u._id, name: u.name, email: u.email, department: u.department, role: u.role })));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
