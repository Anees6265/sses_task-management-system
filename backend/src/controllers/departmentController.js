const mongoose = require('mongoose');
const User = require('../models/User');

exports.getAllDepartments = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const departments = await User.distinct('department', { department: { $ne: null } });
      return res.json(departments.sort());
    } else {
      return res.json(['Computer Science', 'Information Technology', 'Electronics & Comm.', 'Management']);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
