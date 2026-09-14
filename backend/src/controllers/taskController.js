const mongoose = require('mongoose');
const Task = require('../models/Task');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const { sendPushNotification } = require('./notificationController');
const User = require('../models/User');
const { demoTasks, demoUsers } = require('../utils/mockStore');

const getMockStats = (user) => {
  let tasks = demoTasks;
  if (user.role === 'hod') {
    tasks = demoTasks.filter(t => t.department === user.department);
  } else if (user.role === 'user') {
    tasks = demoTasks.filter(t => t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(user._id)));
  }

  const totalTasks = tasks.length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const inprogressTasks = tasks.filter(t => t.status === 'inprogress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const deptMap = {};
  tasks.forEach(t => {
    const dept = t.department || 'General';
    if (!deptMap[dept]) {
      deptMap[dept] = { _id: dept, total: 0, todo: 0, inprogress: 0, completed: 0 };
    }
    deptMap[dept].total++;
    if (t.status === 'todo') deptMap[dept].todo++;
    if (t.status === 'inprogress') deptMap[dept].inprogress++;
    if (t.status === 'completed') deptMap[dept].completed++;
  });
  const departmentStats = Object.values(deptMap);

  return {
    totalTasks,
    todoTasks,
    inprogressTasks,
    completedTasks,
    departmentStats,
    facultyStats: []
  };
};

exports.getTasks = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Serving tasks from Mock Store');
      let tasks = demoTasks;
      if (req.user.role === 'hod') {
        tasks = demoTasks.filter(t => t.department === req.user.department);
      } else if (req.user.role === 'user') {
        tasks = demoTasks.filter(t => t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(req.user._id)));
      }
      return res.json(tasks);
    }

    let filter = {};
    
    if (req.user.role === 'admin') {
      const adminAndHodUsers = await User.find({ role: { $in: ['admin', 'hod'] } }).select('_id');
      const adminAndHodIds = adminAndHodUsers.map(u => u._id);
      
      filter = {
        createdBy: { $in: adminAndHodIds }
      };
    } else if (req.user.role === 'hod') {
      const adminAndHodUsers = await User.find({ 
        role: { $in: ['admin', 'hod'] },
        $or: [
          { department: req.user.department },
          { role: 'admin' }
        ]
      }).select('_id');
      const adminAndHodIds = adminAndHodUsers.map(u => u._id);
      
      filter = { 
        department: req.user.department,
        createdBy: { $in: adminAndHodIds }
      };
    } else {
      filter = { assignedTo: req.user._id };
    }
    
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    if (mongoose.connection.readyState !== 1 || (error.message && error.message.includes('buffering timed out'))) {
      console.log('⚡ Serving tasks fallback from Mock Store');
      let tasks = demoTasks;
      if (req.user.role === 'hod') {
        tasks = demoTasks.filter(t => t.department === req.user.department);
      } else if (req.user.role === 'user') {
        tasks = demoTasks.filter(t => t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(req.user._id)));
      }
      return res.json(tasks);
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getTasksByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    
    // Only HOD and Admin can view faculty tasks
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Serving faculty tasks from Mock Store');
      const tasks = demoTasks.filter(t => 
        t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(facultyId))
      );
      return res.json(tasks);
    }
    
    // Get Admin and HOD users
    const adminAndHodUsers = await User.find({ role: { $in: ['admin', 'hod'] } }).select('_id');
    const adminAndHodIds = adminAndHodUsers.map(u => u._id);
    
    let filter = { 
      assignedTo: facultyId,
      createdBy: { $in: adminAndHodIds }
    };
    
    // HOD can only see faculty in their department
    if (req.user.role === 'hod') {
      filter.department = req.user.department;
    }
    
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    if (mongoose.connection.readyState !== 1 || (error.message && error.message.includes('buffering timed out'))) {
      const tasks = demoTasks.filter(t => 
        t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(req.params.facultyId))
      );
      return res.json(tasks);
    }
    res.status(500).json({ message: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Creating task in Mock Store');
      let taskData = { ...req.body };
      if (req.user.role === 'user') {
        taskData.assignedTo = [req.user._id];
        taskData.department = req.user.department;
        taskData.isPersonal = true;
      }
      const newTask = {
        _id: '64t' + Date.now().toString(16),
        ...taskData,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        department: taskData.department || req.user.department || 'General',
        createdBy: { _id: req.user._id, name: req.user.name, email: req.user.email },
        assignedTo: (taskData.assignedTo || []).map(id => {
          const u = demoUsers.find(du => du._id === id);
          return u ? { _id: u._id, name: u.name, email: u.email } : { _id: id, name: 'Assigned User', email: '' };
        }),
        createdAt: new Date().toISOString()
      };
      demoTasks.unshift(newTask);
      return res.status(201).json(newTask);
    }

    let taskData = { ...req.body };
    
    // Faculty can only create tasks for themselves
    if (req.user.role === 'user') {
      taskData.assignedTo = [req.user._id];
      taskData.department = req.user.department;
      taskData.isPersonal = true; // Mark as personal task
    }
    
    const task = await Task.create({
      ...taskData,
      department: taskData.department || req.user.department,
      createdBy: req.user._id
    });
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email phoneNumber')
      .populate('createdBy', 'name email');
    
    // Send notifications to all assigned users
    if (populatedTask.assignedTo && populatedTask.assignedTo.length > 0) {
      console.log('📧 Sending notifications for task:', populatedTask.title);
      
      // Send email and push notification to each assigned user
      populatedTask.assignedTo.forEach(user => {
        // Email notification
        sendTaskAssignmentEmail(
          user.email,
          user.name,
          populatedTask.title,
          populatedTask.description,
          populatedTask.priority,
          populatedTask.dueDate
        ).catch(err => console.error(`❌ Email failed for ${user.email}:`, err.message));
        
        // Push notification
        sendPushNotification(
          user._id,
          '📋 New Task Assigned',
          `${populatedTask.title} - Priority: ${populatedTask.priority}`,
          { type: 'task', taskId: populatedTask._id.toString() }
        ).catch(err => console.error(`❌ Push notification failed for ${user.email}:`, err.message));
      });
    }
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('❌ Task creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Updating task in Mock Store');
      const index = demoTasks.findIndex(t => String(t._id) === String(req.params.id));
      if (index !== -1) {
        demoTasks[index] = { ...demoTasks[index], ...req.body };
        return res.json(demoTasks[index]);
      }
      return res.status(404).json({ message: 'Task not found in mock store' });
    }

    let filter = {};
    
    if (req.user.role === 'admin') {
      filter = { _id: req.params.id };
    } else if (req.user.role === 'hod') {
      filter = { _id: req.params.id, department: req.user.department };
    } else {
      // Faculty can only update their own tasks
      filter = { _id: req.params.id, assignedTo: req.user._id };
    }
    
    const task = await Task.findOneAndUpdate(
      filter,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Deleting task in Mock Store');
      const index = demoTasks.findIndex(t => String(t._id) === String(req.params.id));
      if (index !== -1) {
        demoTasks.splice(index, 1);
        return res.json({ message: 'Task deleted successfully' });
      }
      return res.status(404).json({ message: 'Task not found in mock store' });
    }

    let filter = {};
    
    if (req.user.role === 'admin') {
      filter = { _id: req.params.id };
    } else if (req.user.role === 'hod') {
      filter = { _id: req.params.id, department: req.user.department };
    } else {
      // Faculty cannot delete tasks
      return res.status(403).json({ message: 'You do not have permission to delete tasks' });
    }
    
    const task = await Task.findOneAndDelete(filter);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Serving dashboard stats from Mock Store');
      return res.json(getMockStats(req.user));
    }

    let filter = {};
    
    if (req.user.role === 'admin') {
      const adminAndHodUsers = await User.find({ role: { $in: ['admin', 'hod'] } }).select('_id');
      const adminAndHodIds = adminAndHodUsers.map(u => u._id);
      filter = { createdBy: { $in: adminAndHodIds } };
    } else if (req.user.role === 'hod') {
      const adminAndHodUsers = await User.find({ 
        role: { $in: ['admin', 'hod'] },
        $or: [
          { department: req.user.department },
          { role: 'admin' }
        ]
      }).select('_id');
      const adminAndHodIds = adminAndHodUsers.map(u => u._id);
      filter = { 
        department: req.user.department,
        createdBy: { $in: adminAndHodIds }
      };
    } else {
      // Faculty: Only their assigned tasks
      filter = { assignedTo: req.user._id };
    }
    
    const totalTasks = await Task.countDocuments(filter);
    const todoTasks = await Task.countDocuments({ ...filter, status: 'todo' });
    const inprogressTasks = await Task.countDocuments({ ...filter, status: 'inprogress' });
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    
    let matchFilter = filter;
    if (req.user.role === 'admin') {
      const adminAndHodUsers = await User.find({ role: { $in: ['admin', 'hod'] } }).select('_id');
      matchFilter = { createdBy: { $in: adminAndHodUsers.map(u => u._id) } };
    } else if (req.user.role === 'hod') {
      const adminAndHodUsers = await User.find({ 
        role: { $in: ['admin', 'hod'] },
        $or: [{ department: req.user.department }, { role: 'admin' }]
      }).select('_id');
      matchFilter = { department: req.user.department, createdBy: { $in: adminAndHodUsers.map(u => u._id) } };
    }
    
    const departmentStats = await Task.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inprogress: { $sum: { $cond: [{ $eq: ['$status', 'inprogress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    // Faculty-wise stats for HOD
    let facultyStats = [];
    if (req.user.role === 'hod') {
      const adminAndHodUsers = await User.find({ 
        role: { $in: ['admin', 'hod'] },
        $or: [{ department: req.user.department }, { role: 'admin' }]
      }).select('_id');
      
      facultyStats = await Task.aggregate([
        { $match: { department: req.user.department, createdBy: { $in: adminAndHodUsers.map(u => u._id) } } },
        { $unwind: '$assignedTo' },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'facultyInfo'
          }
        },
        { $unwind: '$facultyInfo' },
        {
          $group: {
            _id: '$assignedTo',
            name: { $first: '$facultyInfo.name' },
            email: { $first: '$facultyInfo.email' },
            total: { $sum: 1 },
            todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
            inprogress: { $sum: { $cond: [{ $eq: ['$status', 'inprogress'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        },
        { $sort: { name: 1 } }
      ]);
    }

    res.json({
      totalTasks,
      todoTasks,
      inprogressTasks,
      completedTasks,
      departmentStats,
      facultyStats
    });
  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error.message);
    if (mongoose.connection.readyState !== 1 || (error.message && error.message.includes('buffering timed out'))) {
      console.log('⚡ Serving dashboard stats fallback from Mock Store');
      return res.json(getMockStats(req.user));
    }
    res.status(500).json({ message: error.message });
  }
};

