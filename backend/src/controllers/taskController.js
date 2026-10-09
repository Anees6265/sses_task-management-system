const mongoose = require('mongoose');
const Task = require('../models/Task');
const Department = require('../models/Department');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const { sendPushNotification } = require('./notificationController');
const { demoTasks, demoUsers } = require('../utils/mockStore');
const path = require('path');
const fs = require('fs');

const calculateNextDueDate = (currentDueDate, pattern, interval = 1) => {
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  const nextDate = new Date(baseDate);
  const numInterval = Number(interval) || 1;

  if (pattern === 'daily') {
    nextDate.setDate(nextDate.getDate() + numInterval);
  } else if (pattern === 'weekly') {
    nextDate.setDate(nextDate.getDate() + (7 * numInterval));
  } else if (pattern === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + numInterval);
  } else {
    nextDate.setDate(nextDate.getDate() + numInterval);
  }
  return nextDate;
};

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
        tasks = demoTasks.filter(t => !t.department || t.department === req.user.department);
      } else if (req.user.role === 'user') {
        tasks = demoTasks.filter(t => 
          (t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(req.user._id))) ||
          (t.createdBy && String(t.createdBy._id || t.createdBy) === String(req.user._id))
        );
      }
      return res.json(tasks);
    }

    let filter = {};
    
    if (req.user.role === 'admin') {
      filter = {};
    } else if (req.user.role === 'hod') {
      filter = { department: req.user.department };
    } else {
      filter = {
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      };
    }
    
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    if (mongoose.connection.readyState !== 1 || (error.message && error.message.includes('buffering timed out'))) {
      console.log('⚡ Serving tasks fallback from Mock Store');
      let tasks = demoTasks;
      if (req.user.role === 'hod') {
        tasks = demoTasks.filter(t => !t.department || t.department === req.user.department);
      } else if (req.user.role === 'user') {
        tasks = demoTasks.filter(t => 
          (t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(req.user._id))) ||
          (t.createdBy && String(t.createdBy._id || t.createdBy) === String(req.user._id))
        );
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
      let tasks = demoTasks.filter(t => 
        t.assignedTo && t.assignedTo.some(u => String(u._id || u) === String(facultyId))
      );
      if (req.user.role === 'hod') {
        tasks = tasks.filter(t => t.department === req.user.department);
      }
      return res.json(tasks);
    }

    const targetFaculty = await User.findById(facultyId);
    if (!targetFaculty) {
      return res.status(404).json({ message: 'Faculty member not found' });
    }

    if (req.user.role === 'hod' && targetFaculty.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only view tasks for faculty in your department.' });
    }
    
    let filter = { assignedTo: facultyId };
    if (req.user.role === 'hod') {
      filter.department = req.user.department;
    }
    
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email department')
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
    let taskData = { ...req.body };

    // RBAC department check for HOD
    if (req.user.role === 'hod') {
      taskData.department = req.user.department;
      
      // Verify assigned faculty belong to HOD department
      if (taskData.assignedTo && taskData.assignedTo.length > 0 && mongoose.connection.readyState === 1) {
        const validFaculty = await User.find({
          _id: { $in: taskData.assignedTo },
          department: req.user.department
        }).select('_id');
        taskData.assignedTo = validFaculty.map(f => f._id);
      }
    } else if (req.user.role === 'user') {
      taskData.assignedTo = [req.user._id];
      taskData.department = req.user.department;
      taskData.isPersonal = true;
    }

    if (mongoose.connection.readyState !== 1) {
      console.log('⚡ Creating task in Mock Store');
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
        attachments: [],
        comments: [],
        assignmentHistory: [],
        createdAt: new Date().toISOString()
      };
      demoTasks.unshift(newTask);
      return res.status(201).json(newTask);
    }

    const task = await Task.create({
      ...taskData,
      department: taskData.department || req.user.department,
      createdBy: req.user._id
    });
    
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email phoneNumber department')
      .populate('createdBy', 'name email department');

    // Audit Logging
    try {
      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TASK_CREATED',
        departmentName: task.department,
        details: { taskId: task._id, title: task.title, priority: task.priority, dueDate: task.dueDate }
      });

      if (task.assignedTo && task.assignedTo.length > 0) {
        await ActivityLog.create({
          performedBy: req.user._id,
          action: 'TASK_ASSIGNED',
          departmentName: task.department,
          details: { taskId: task._id, title: task.title, assignedCount: task.assignedTo.length }
        });
      }

      if (task.isRecurring) {
        await ActivityLog.create({
          performedBy: req.user._id,
          action: 'RECURRING_TASK_CREATED',
          departmentName: task.department,
          details: { taskId: task._id, title: task.title, pattern: task.recurrencePattern, interval: task.recurrenceInterval }
        });
      }
    } catch (logErr) {
      console.warn('ActivityLog error:', logErr.message);
    }

    // Send notifications to all assigned users
    if (populatedTask.assignedTo && populatedTask.assignedTo.length > 0) {
      populatedTask.assignedTo.forEach(user => {
        sendTaskAssignmentEmail(
          user.email,
          user.name,
          populatedTask.title,
          populatedTask.description,
          populatedTask.priority,
          populatedTask.dueDate
        ).catch(err => console.error(`❌ Email failed for ${user.email}:`, err.message));
        
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
        const task = demoTasks[index];
        if (req.user.role === 'hod' && task.department && req.user.department && task.department !== req.user.department) {
          return res.status(403).json({ message: 'Access denied. Task belongs to another department.' });
        }
        if (req.user.role === 'user') {
          const isAssigned = (task.assignedTo || []).some(id => String(id._id || id) === String(req.user._id));
          const isCreator = String(task.createdBy._id || task.createdBy) === String(req.user._id);
          if (!isAssigned && !isCreator) {
            return res.status(403).json({ message: 'Access denied. You can only update your assigned tasks.' });
          }
        }
        demoTasks[index] = { ...demoTasks[index], ...req.body };
        return res.json(demoTasks[index]);
      }
      return res.status(404).json({ message: 'Task not found in mock store' });
    }

    let existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // RBAC Security Check
    if (req.user.role === 'hod' && existingTask.department && req.user.department && existingTask.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied. You can only edit tasks in your department.' });
    } else if (req.user.role === 'user') {
      const isAssigned = (existingTask.assignedTo || []).some(id => String(id._id || id) === String(req.user._id));
      const isCreator = String(existingTask.createdBy._id || existingTask.createdBy) === String(req.user._id);
      if (!isAssigned && !isCreator) {
        return res.status(403).json({ message: 'Access denied. You can only update your assigned tasks.' });
      }
    }

    const oldPriority = existingTask.priority;
    const oldDueDate = existingTask.dueDate ? existingTask.dueDate.toISOString() : null;
    const oldStatus = existingTask.status;

    let updateData = { ...req.body };

    // Set completedAt timestamp when status changes to completed
    if (updateData.status === 'completed' && oldStatus !== 'completed') {
      updateData.completedAt = new Date();
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email department')
      .populate('createdBy', 'name email department');

    // Track Audit Log Events
    try {
      if (updateData.priority && updateData.priority !== oldPriority) {
        await ActivityLog.create({
          performedBy: req.user._id,
          action: 'TASK_PRIORITY_CHANGED',
          departmentName: task.department,
          details: { taskId: task._id, oldPriority, newPriority: updateData.priority }
        });
      }

      if (updateData.dueDate) {
        const newDueDate = new Date(updateData.dueDate).toISOString();
        if (newDueDate !== oldDueDate) {
          await ActivityLog.create({
            performedBy: req.user._id,
            action: 'TASK_DEADLINE_CHANGED',
            departmentName: task.department,
            details: { taskId: task._id, oldDueDate, newDueDate }
          });
        }
      }

      if (updateData.status && updateData.status !== oldStatus) {
        await ActivityLog.create({
          performedBy: req.user._id,
          action: 'TASK_STATUS_CHANGED',
          departmentName: task.department,
          details: { taskId: task._id, oldStatus, newStatus: updateData.status }
        });
      }
    } catch (lErr) {}

    // Handle Recurring Task Auto-Spawn on Completion
    if (updateData.status === 'completed' && oldStatus !== 'completed' && task.isRecurring && task.recurrencePattern !== 'none') {
      try {
        const nextDueDate = calculateNextDueDate(task.dueDate || new Date(), task.recurrencePattern, task.recurrenceInterval);
        const recurringTask = await Task.create({
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'todo',
          department: task.department,
          assignedTo: task.assignedTo.map(u => u._id || u),
          createdBy: task.createdBy._id || task.createdBy,
          dueDate: nextDueDate,
          isRecurring: true,
          recurrencePattern: task.recurrencePattern,
          recurrenceInterval: task.recurrenceInterval,
          parentTaskId: task._id
        });

        await ActivityLog.create({
          performedBy: req.user._id,
          action: 'RECURRING_TASK_CREATED',
          departmentName: task.department,
          details: { parentTaskId: task._id, newTaskId: recurringTask._id, title: recurringTask.title, nextDueDate }
        });
      } catch (recErr) {
        console.error('Error auto-spawning recurring task:', recErr.message);
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied. Only HOD or Admin can reassign tasks.' });
    }

    if (mongoose.connection.readyState === 1) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (req.user.role === 'hod' && task.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only reassign tasks in your department.' });
      }

      let newAssignedUserIds = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);

      // Verify all new assigned users belong to HOD department
      if (req.user.role === 'hod' && newAssignedUserIds.length > 0) {
        const validFaculty = await User.find({
          _id: { $in: newAssignedUserIds },
          department: req.user.department
        }).select('_id');
        
        if (validFaculty.length !== newAssignedUserIds.length) {
          return res.status(400).json({ message: 'Cannot assign task to faculty from another department.' });
        }
      }

      const previousAssignedTo = [...task.assignedTo];

      task.assignedTo = newAssignedUserIds;
      task.assignmentHistory.push({
        previousAssignedTo,
        newAssignedTo: newAssignedUserIds,
        reassignedBy: req.user._id,
        reassignedByName: req.user.name,
        reassignedAt: new Date()
      });

      await task.save();

      const updatedTask = await Task.findById(id)
        .populate('assignedTo', 'name email department')
        .populate('createdBy', 'name email department');

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TASK_REASSIGNED',
        departmentName: task.department,
        details: { taskId: task._id, previousAssignedCount: previousAssignedTo.length, newAssignedCount: newAssignedUserIds.length }
      });

      return res.json(updatedTask);
    } else {
      const index = demoTasks.findIndex(t => String(t._id) === String(id));
      if (index !== -1) {
        let newAssignedUserIds = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
        demoTasks[index].assignedTo = newAssignedUserIds.map(uId => {
          const u = demoUsers.find(du => String(du._id) === String(uId));
          return u ? { _id: u._id, name: u.name, email: u.email } : { _id: uId, name: 'Assigned User', email: '' };
        });
        return res.json(demoTasks[index]);
      }
      return res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    if (mongoose.connection.readyState === 1) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (req.user.role === 'hod' && task.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. Task belongs to another department.' });
      }

      task.comments.push({
        text: text.trim(),
        user: req.user._id,
        userName: req.user.name,
        createdAt: new Date()
      });

      await task.save();

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TASK_COMMENT_ADDED',
        departmentName: task.department,
        details: { taskId: task._id, commentSnippet: text.trim().substring(0, 50) }
      });

      return res.json(task.comments);
    } else {
      const index = demoTasks.findIndex(t => String(t._id) === String(id));
      if (index !== -1) {
        if (!demoTasks[index].comments) demoTasks[index].comments = [];
        const newComment = {
          _id: 'c_' + Date.now(),
          text: text.trim(),
          userName: req.user.name,
          createdAt: new Date()
        };
        demoTasks[index].comments.push(newComment);
        return res.json(demoTasks[index].comments);
      }
      return res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const task = await Task.findById(id).select('comments department');
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (req.user.role === 'hod' && task.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json(task.comments || []);
    } else {
      const task = demoTasks.find(t => String(t._id) === String(id));
      return res.json(task ? (task.comments || []) : []);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (mongoose.connection.readyState === 1) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (req.user.role === 'hod' && task.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only attach files to tasks in your department.' });
      }

      const attachmentObj = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      };

      task.attachments.push(attachmentObj);
      await task.save();

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TASK_ATTACHMENT_ADDED',
        departmentName: task.department,
        details: { taskId: task._id, filename: req.file.originalname, size: req.file.size }
      });

      return res.status(201).json(task.attachments);
    } else {
      const index = demoTasks.findIndex(t => String(t._id) === String(id));
      if (index !== -1) {
        if (!demoTasks[index].attachments) demoTasks[index].attachments = [];
        const attachmentObj = {
          _id: 'att_' + Date.now(),
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: `/uploads/${req.file.filename}`,
          mimetype: req.file.mimetype,
          size: req.file.size,
          uploadedAt: new Date()
        };
        demoTasks[index].attachments.push(attachmentObj);
        return res.status(201).json(demoTasks[index].attachments);
      }
      return res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (req.user.role === 'hod' && task.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const attachment = task.attachments.id(attachmentId);
      if (attachment && attachment.filename) {
        const filePath = path.join(__dirname, '../../uploads', attachment.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      task.attachments.pull(attachmentId);
      await task.save();

      return res.json(task.attachments);
    } else {
      const index = demoTasks.findIndex(t => String(t._id) === String(id));
      if (index !== -1 && demoTasks[index].attachments) {
        demoTasks[index].attachments = demoTasks[index].attachments.filter(a => String(a._id) !== String(attachmentId));
        return res.json(demoTasks[index].attachments);
      }
      return res.status(404).json({ message: 'Task not found' });
    }
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
      filter = {};
    } else if (req.user.role === 'hod') {
      filter = { department: req.user.department };
    } else {
      filter = { assignedTo: req.user._id };
    }
    
    const totalTasks = await Task.countDocuments(filter);
    const todoTasks = await Task.countDocuments({ ...filter, status: 'todo' });
    const inprogressTasks = await Task.countDocuments({ ...filter, status: 'inprogress' });
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    
    let matchFilter = filter;
    
    const aggregatedDepts = await Task.aggregate([
      { $match: { ...matchFilter, department: { $ne: null, $ne: '' } } },
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

    let departmentStats = [];
    if (req.user.role === 'admin') {
      const activeDepts = await Department.find({ status: 'active' }).select('name code');
      const statsMap = new Map();
      aggregatedDepts.forEach(d => {
        if (d._id) statsMap.set(d._id.toString(), d);
      });

      if (activeDepts.length > 0) {
        departmentStats = activeDepts.map(d => {
          const matched = statsMap.get(d.name) || statsMap.get(d.code) || { total: 0, todo: 0, inprogress: 0, completed: 0 };
          return {
            _id: d.name,
            total: matched.total || 0,
            todo: matched.todo || 0,
            inprogress: matched.inprogress || 0,
            completed: matched.completed || 0
          };
        });
      } else {
        departmentStats = aggregatedDepts.filter(d => d._id);
      }
    } else {
      departmentStats = aggregatedDepts.filter(d => d._id);
    }

    // Faculty-wise stats for HOD
    let facultyStats = [];
    if (req.user.role === 'hod') {
      facultyStats = await Task.aggregate([
        { $match: { department: req.user.department } },
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
