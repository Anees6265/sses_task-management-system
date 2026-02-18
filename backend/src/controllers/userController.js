const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ department: req.user.department }).select('name email department');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
