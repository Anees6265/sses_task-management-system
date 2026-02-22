const Task = require('../models/Task');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { sendSignalMessage } = require('../services/signalService');
const User = require('../models/User');

exports.getTasks = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { department: req.user.department };
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
    const task = await Task.create({
      ...req.body,
      department: req.body.department || req.user.department,
      createdBy: req.user._id
    });
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    
    if (populatedTask.assignedTo) {
      await sendTaskAssignmentEmail(
        populatedTask.assignedTo.email,
        populatedTask.assignedTo.name,
        populatedTask.title,
        populatedTask.description,
        populatedTask.priority,
        populatedTask.dueDate
      );
      
      if (populatedTask.assignedTo.phoneNumber) {
        await sendSignalMessage(
          populatedTask.assignedTo.phoneNumber,
          populatedTask.title,
          populatedTask.description,
          populatedTask.priority,
          populatedTask.dueDate
        );
      }
    }
    
    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id } 
      : { _id: req.params.id, department: req.user.department };
    
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
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, department: req.user.department };
    
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
    const filter = req.user.role === 'admin' ? {} : { department: req.user.department };
    
    const totalTasks = await Task.countDocuments(filter);
    const todoTasks = await Task.countDocuments({ ...filter, status: 'todo' });
    const inprogressTasks = await Task.countDocuments({ ...filter, status: 'inprogress' });
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    
    const departmentStats = await Task.aggregate([
      { $match: req.user.role === 'admin' ? {} : { department: req.user.department } },
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

    res.json({
      totalTasks,
      todoTasks,
      inprogressTasks,
      completedTasks,
      departmentStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
