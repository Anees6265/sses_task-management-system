const Task = require('../models/Task');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const User = require('../models/User');

exports.getTasks = async (req, res) => {
  try {
    let filter = {};
    
    if (req.user.role === 'admin') {
      // Admin: All non-personal tasks
      filter = {
        $or: [
          { isPersonal: false },
          { isPersonal: { $exists: false } }
        ]
      };
    } else if (req.user.role === 'hod') {
      // HOD: All tasks in their department except personal tasks of faculty
      filter = { 
        department: req.user.department,
        $or: [
          { isPersonal: false },
          { isPersonal: { $exists: false } },
          { createdBy: req.user._id }
        ]
      };
    } else {
      // Faculty: Only tasks assigned to them
      filter = { assignedTo: req.user._id };
    }
    
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
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
    
    let filter = { 
      assignedTo: facultyId,
      $or: [
        { isPersonal: false },
        { isPersonal: { $exists: false } }
      ]
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
    res.status(500).json({ message: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
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
      
      // Send email to each assigned user
      populatedTask.assignedTo.forEach(user => {
        sendTaskAssignmentEmail(
          user.email,
          user.name,
          populatedTask.title,
          populatedTask.description,
          populatedTask.priority,
          populatedTask.dueDate
        ).catch(err => console.error(`❌ Email failed for ${user.email}:`, err.message));
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
    let filter = {};
    
    if (req.user.role === 'admin') {
      filter = {
        $or: [
          { isPersonal: false },
          { isPersonal: { $exists: false } }
        ]
      };
    } else if (req.user.role === 'hod') {
      filter = { 
        department: req.user.department,
        $or: [
          { isPersonal: false },
          { isPersonal: { $exists: false } },
          { createdBy: req.user._id }
        ]
      };
    } else {
      // Faculty: Only their assigned tasks
      filter = { assignedTo: req.user._id };
    }
    
    const totalTasks = await Task.countDocuments(filter);
    const todoTasks = await Task.countDocuments({ ...filter, status: 'todo' });
    const inprogressTasks = await Task.countDocuments({ ...filter, status: 'inprogress' });
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    
    const departmentStats = await Task.aggregate([
      { $match: req.user.role === 'admin' ? { $or: [{ isPersonal: false }, { isPersonal: { $exists: false } }] } : (req.user.role === 'hod' ? { department: req.user.department, $or: [{ isPersonal: false }, { isPersonal: { $exists: false } }] } : { assignedTo: req.user._id }) },
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
      facultyStats = await Task.aggregate([
        { $match: { department: req.user.department, $or: [{ isPersonal: false }, { isPersonal: { $exists: false } }] } },
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
    res.status(500).json({ message: error.message });
  }
};
