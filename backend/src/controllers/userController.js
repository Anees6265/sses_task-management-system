const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { department: req.user.department };
    const users = await User.find(filter).select('name email department');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
