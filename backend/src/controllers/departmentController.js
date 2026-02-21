const User = require('../models/User');

exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await User.distinct('department', { department: { $ne: null } });
    res.json(departments.sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
