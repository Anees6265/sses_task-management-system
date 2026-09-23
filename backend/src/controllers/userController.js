const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const { demoUsers, demoTasks } = require('../utils/mockStore');

exports.getAllUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const filter = (req.user.role === 'admin' || req.user.role === 'hod')
        ? (req.user.role === 'admin' ? {} : { department: req.user.department })
        : { department: req.user.department };
      const users = await User.find(filter).select('name email department role status phoneNumber');
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
    status: u.status || 'active',
    phoneNumber: u.phoneNumber || ''
  })));
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
        ).select('name email department role');

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

exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin can create users' });
    }

    const { name, email, password, role, department, phoneNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@ssism.org')) {
      return res.status(400).json({ message: 'Only @ssism.org email addresses are allowed' });
    }

    if (!['admin', 'hod', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user role specified' });
    }

    if (role !== 'admin' && !department) {
      return res.status(400).json({ message: 'Department is required for HOD and Faculty roles' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      const userData = {
        name,
        email: normalizedEmail,
        password,
        role,
        phoneNumber
      };
      if (role !== 'admin') {
        userData.department = department;
      }

      const user = await User.create(userData);

      const demoIndex = demoUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      if (demoIndex === -1) {
        demoUsers.push({
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          passwordRaw: password,
          role: user.role,
          department: user.department,
          phoneNumber: user.phoneNumber
        });
      }

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        phoneNumber: user.phoneNumber
      });
    } else {
      const demoUser = demoUsers.find(u => u.email.toLowerCase() === normalizedEmail);
      if (demoUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      const newUser = {
        _id: '64e' + Date.now().toString(16),
        name,
        email: normalizedEmail,
        department: role !== 'admin' ? department : undefined,
        role,
        phoneNumber,
        passwordRaw: password
      };
      demoUsers.push(newUser);

      return res.status(201).json({
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        department: newUser.department,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber } = req.body;

    let targetUser = null;
    let isMongoDoc = false;

    if (mongoose.connection.readyState === 1) {
      try {
        targetUser = await User.findById(id);
        if (targetUser) isMongoDoc = true;
      } catch (err) {
        console.warn('MongoDB findById failed:', err.message);
      }
    }

    if (!targetUser) {
      targetUser = demoUsers.find(u => String(u._id) === String(id));
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'hod') {
      if (targetUser.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. HOD can only edit faculty members.' });
      }
      if (targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only edit faculty in your own department.' });
      }
    } else if (req.user.role !== 'admin' && String(req.user._id) !== String(id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (email && email.toLowerCase() !== targetUser.email.toLowerCase()) {
      if (!email.toLowerCase().endsWith('@ssism.org')) {
        return res.status(400).json({ message: 'Only @ssism.org email domain is allowed' });
      }
      if (isMongoDoc) {
        const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
        if (emailExists) return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (isMongoDoc) {
      if (name) targetUser.name = name.trim();
      if (phoneNumber !== undefined) targetUser.phoneNumber = phoneNumber.trim();
      if (email && (req.user.role === 'admin' || req.user.role === 'hod')) {
        targetUser.email = email.toLowerCase().trim();
      }
      await targetUser.save();

      const demoIndex = demoUsers.findIndex(u => String(u._id) === String(id));
      if (demoIndex !== -1) {
        demoUsers[demoIndex].name = targetUser.name;
        demoUsers[demoIndex].email = targetUser.email;
        demoUsers[demoIndex].phoneNumber = targetUser.phoneNumber;
      }

      return res.json({
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department,
        role: targetUser.role,
        status: targetUser.status || 'active',
        phoneNumber: targetUser.phoneNumber
      });
    } else {
      if (name) targetUser.name = name.trim();
      if (phoneNumber !== undefined) targetUser.phoneNumber = phoneNumber.trim();
      if (email && (req.user.role === 'admin' || req.user.role === 'hod')) {
        targetUser.email = email.toLowerCase().trim();
      }
      return res.json({
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department,
        role: targetUser.role,
        status: targetUser.status || 'active',
        phoneNumber: targetUser.phoneNumber
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active or inactive' });
    }

    let targetUser = null;
    let isMongoDoc = false;

    if (mongoose.connection.readyState === 1) {
      try {
        targetUser = await User.findById(id);
        if (targetUser) isMongoDoc = true;
      } catch (err) {
        console.warn('MongoDB findById error:', err.message);
      }
    }

    if (!targetUser) {
      targetUser = demoUsers.find(u => String(u._id) === String(id));
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'hod') {
      if (targetUser.role !== 'user') {
        return res.status(403).json({ message: 'HOD cannot activate/deactivate Admin or other HOD accounts' });
      }
      if (targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only manage faculty in your own department.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin or HOD can change account status' });
    }

    if (isMongoDoc) {
      targetUser.status = status;
      await targetUser.save();

      const demoIndex = demoUsers.findIndex(u => String(u._id) === String(id));
      if (demoIndex !== -1) {
        demoUsers[demoIndex].status = status;
      }

      return res.json({
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department,
        role: targetUser.role,
        status: targetUser.status,
        phoneNumber: targetUser.phoneNumber
      });
    } else {
      targetUser.status = status;
      return res.json({
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department,
        role: targetUser.role,
        status: targetUser.status,
        phoneNumber: targetUser.phoneNumber
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFacultyWorkload = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const deptFilter = req.user.role === 'hod' ? req.user.department : (req.query.department || 'all');

    if (mongoose.connection.readyState === 1) {
      const userFilter = { role: 'user' };
      if (deptFilter !== 'all') {
        userFilter.department = deptFilter;
      }

      const facultyList = await User.find(userFilter).select('name email department role status phoneNumber');
      const facultyIds = facultyList.map(f => f._id);

      const tasks = await Task.find({
        $or: [
          { assignedTo: { $in: facultyIds } },
          { createdBy: { $in: facultyIds } }
        ]
      }).populate('assignedTo', 'name email').populate('createdBy', 'name email');

      const now = new Date();

      const workloadList = facultyList.map(faculty => {
        const userTasks = tasks.filter(t => {
          if (!t.assignedTo) return false;
          if (Array.isArray(t.assignedTo)) {
            return t.assignedTo.some(u => String(u._id || u) === String(faculty._id));
          }
          return String(t.assignedTo._id || t.assignedTo) === String(faculty._id);
        });

        const totalTasks = userTasks.length;
        const todoTasks = userTasks.filter(t => t.status === 'todo').length;
        const inprogressTasks = userTasks.filter(t => t.status === 'inprogress').length;
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const overdueTasks = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const highPriorityTasks = userTasks.filter(t => t.priority === 'high').length;
        const upcomingTasks = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) >= now).length;

        return {
          faculty: {
            _id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            department: faculty.department,
            role: faculty.role,
            status: faculty.status || 'active'
          },
          workload: {
            totalTasks,
            todoTasks,
            inprogressTasks,
            completedTasks,
            overdueTasks,
            highPriorityTasks,
            upcomingTasks
          },
          assignedTasks: userTasks
        };
      });

      return res.json(workloadList);
    } else {
      let facultyList = demoUsers.filter(u => u.role === 'user');
      if (deptFilter !== 'all') {
        facultyList = facultyList.filter(u => u.department === deptFilter);
      }

      const now = new Date();

      const workloadList = facultyList.map(faculty => {
        const userTasks = demoTasks.filter(t => {
          if (!t.assignedTo) return false;
          return t.assignedTo.some(u => String(u._id || u) === String(faculty._id));
        });

        const totalTasks = userTasks.length;
        const todoTasks = userTasks.filter(t => t.status === 'todo').length;
        const inprogressTasks = userTasks.filter(t => t.status === 'inprogress').length;
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const overdueTasks = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const highPriorityTasks = userTasks.filter(t => t.priority === 'high').length;
        const upcomingTasks = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) >= now).length;

        return {
          faculty: {
            _id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            department: faculty.department,
            role: faculty.role,
            status: faculty.status || 'active'
          },
          workload: {
            totalTasks,
            todoTasks,
            inprogressTasks,
            completedTasks,
            overdueTasks,
            highPriorityTasks,
            upcomingTasks
          },
          assignedTasks: userTasks
        };
      });

      return res.json(workloadList);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFacultyPerformance = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const deptFilter = req.user.role === 'hod' ? req.user.department : (req.query.department || 'all');

    if (mongoose.connection.readyState === 1) {
      const userFilter = { role: 'user' };
      if (deptFilter !== 'all') {
        userFilter.department = deptFilter;
      }

      const facultyList = await User.find(userFilter).select('name email department role status');
      const facultyIds = facultyList.map(f => f._id);

      const tasks = await Task.find({ assignedTo: { $in: facultyIds } });
      const now = new Date();

      const performanceData = facultyList.map(faculty => {
        const userTasks = tasks.filter(t => {
          if (!t.assignedTo) return false;
          if (Array.isArray(t.assignedTo)) {
            return t.assignedTo.some(u => String(u._id || u) === String(faculty._id));
          }
          return String(t.assignedTo._id || t.assignedTo) === String(faculty._id);
        });

        const totalTasks = userTasks.length;
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const pendingTasks = userTasks.filter(t => t.status !== 'completed').length;
        const overdueTasks = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const onTimeCompleted = userTasks.filter(t => t.status === 'completed' && (!t.dueDate || new Date(t.updatedAt || t.createdAt) <= new Date(t.dueDate))).length;
        const onTimeCompletionRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 0;

        return {
          faculty: {
            _id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            department: faculty.department
          },
          metrics: {
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
            completionRate,
            onTimeCompletionRate
          }
        };
      });

      return res.json(performanceData);
    } else {
      let facultyList = demoUsers.filter(u => u.role === 'user');
      if (deptFilter !== 'all') {
        facultyList = facultyList.filter(u => u.department === deptFilter);
      }

      const now = new Date();

      const performanceData = facultyList.map(faculty => {
        const userTasks = demoTasks.filter(t => {
          if (!t.assignedTo) return false;
          return t.assignedTo.some(u => String(u._id || u) === String(faculty._id));
        });

        const totalTasks = userTasks.length;
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const pendingTasks = userTasks.filter(t => t.status !== 'completed').length;
        const overdueTasks = userTasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const onTimeCompleted = userTasks.filter(t => t.status === 'completed').length;
        const onTimeCompletionRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 0;

        return {
          faculty: {
            _id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            department: faculty.department
          },
          metrics: {
            totalTasks,
            completedTasks,
            pendingTasks,
            overdueTasks,
            completionRate,
            onTimeCompletionRate
          }
        };
      });

      return res.json(performanceData);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFacultyTaskHistory = async (req, res) => {
  try {
    const { id } = req.params;

    let targetUser = null;
    if (mongoose.connection.readyState === 1) {
      targetUser = await User.findById(id).select('name email department role');
    }
    if (!targetUser) {
      targetUser = demoUsers.find(u => String(u._id) === String(id));
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'Faculty user not found' });
    }

    if (req.user.role === 'hod' && targetUser.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view task history for faculty in your department.' });
    } else if (req.user.role === 'user' && String(req.user._id) !== String(id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (mongoose.connection.readyState === 1) {
      const tasks = await Task.find({
        $or: [
          { assignedTo: id },
          { createdBy: id }
        ]
      }).populate('assignedTo', 'name email').populate('createdBy', 'name email').sort({ createdAt: -1 });

      return res.json(tasks);
    } else {
      const tasks = demoTasks.filter(t => {
        const isAssigned = t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(id));
        const isCreated = t.createdBy && String(t.createdBy._id || t.createdBy) === String(id);
        return isAssigned || isCreated;
      });

      return res.json(tasks);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


