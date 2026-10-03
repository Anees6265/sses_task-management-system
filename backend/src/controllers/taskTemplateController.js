const TaskTemplate = require('../models/TaskTemplate');
const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const mongoose = require('mongoose');

// In-memory fallback for templates if DB disconnected
let demoTaskTemplates = [
  {
    _id: 'tmpl_1',
    title: 'Standard Course Syllabus Review',
    description: 'Review course syllabus against SSES academic standards and submit for approval.',
    priority: 'high',
    department: 'Computer Science',
    defaultDueDateOffsetDays: 7,
    tags: ['curriculum', 'review']
  },
  {
    _id: 'tmpl_2',
    title: 'Mid-Term Exam Evaluation & Grading',
    description: 'Grade mid-term exam scripts and upload marks to the portal within deadline.',
    priority: 'medium',
    department: 'Information Technology',
    defaultDueDateOffsetDays: 10,
    tags: ['examination', 'grading']
  }
];

exports.getTemplates = async (req, res) => {
  try {
    const userDept = req.user.department;
    
    if (mongoose.connection.readyState === 1) {
      const filter = req.user.role === 'admin' ? {} : { department: userDept };
      const templates = await TaskTemplate.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      return res.json(templates);
    } else {
      let filtered = demoTaskTemplates;
      if (req.user.role === 'hod') {
        filtered = demoTaskTemplates.filter(t => t.department === userDept);
      }
      return res.json(filtered);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hod') {
      return res.status(403).json({ message: 'Access denied. Only HOD or Admin can create task templates.' });
    }

    const { title, description, priority, defaultDueDateOffsetDays, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Template title is required' });
    }

    const department = req.user.role === 'hod' ? req.user.department : (req.body.department || req.user.department || 'General');

    if (mongoose.connection.readyState === 1) {
      const template = await TaskTemplate.create({
        title: title.trim(),
        description: description ? description.trim() : '',
        priority: priority || 'medium',
        department,
        createdBy: req.user._id,
        defaultDueDateOffsetDays: Number(defaultDueDateOffsetDays) || 7,
        tags: Array.isArray(tags) ? tags : []
      });

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TEMPLATE_CREATED',
        departmentName: department,
        details: { templateId: template._id, title: template.title, priority: template.priority }
      });

      return res.status(201).json(template);
    } else {
      const newTmpl = {
        _id: 'tmpl_' + Date.now(),
        title: title.trim(),
        description: description ? description.trim() : '',
        priority: priority || 'medium',
        department,
        createdBy: { _id: req.user._id, name: req.user.name, email: req.user.email },
        defaultDueDateOffsetDays: Number(defaultDueDateOffsetDays) || 7,
        tags: Array.isArray(tags) ? tags : []
      };
      demoTaskTemplates.unshift(newTmpl);
      return res.status(201).json(newTmpl);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const template = await TaskTemplate.findById(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      if (req.user.role === 'hod' && template.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. You can only delete templates in your department.' });
      }

      await TaskTemplate.findByIdAndDelete(id);

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TEMPLATE_DELETED',
        departmentName: template.department,
        details: { templateId: id, title: template.title }
      });

      return res.json({ message: 'Template deleted successfully' });
    } else {
      const idx = demoTaskTemplates.findIndex(t => String(t._id) === String(id));
      if (idx !== -1) {
        demoTaskTemplates.splice(idx, 1);
        return res.json({ message: 'Template deleted successfully' });
      }
      return res.status(404).json({ message: 'Template not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.instantiateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, dueDate } = req.body;

    if (mongoose.connection.readyState === 1) {
      const template = await TaskTemplate.findById(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      if (req.user.role === 'hod' && template.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied. Template belongs to another department.' });
      }

      let calculatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + (template.defaultDueDateOffsetDays || 7) * 24 * 60 * 60 * 1000);

      // Verify assigned faculty belongs to HOD department if HOD
      let assignedUserIds = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
      if (req.user.role === 'hod' && assignedUserIds.length > 0) {
        const validFaculty = await User.find({
          _id: { $in: assignedUserIds },
          department: req.user.department
        }).select('_id');
        assignedUserIds = validFaculty.map(f => f._id);
      }

      const newTask = await Task.create({
        title: template.title,
        description: template.description,
        priority: template.priority,
        department: template.department,
        assignedTo: assignedUserIds,
        createdBy: req.user._id,
        dueDate: calculatedDueDate,
        templateId: template._id
      });

      const populatedTask = await Task.findById(newTask._id)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email');

      await ActivityLog.create({
        performedBy: req.user._id,
        action: 'TEMPLATE_USED',
        departmentName: template.department,
        details: { templateId: template._id, taskId: newTask._id, title: template.title }
      });

      return res.status(201).json(populatedTask);
    } else {
      const template = demoTaskTemplates.find(t => String(t._id) === String(id));
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      let assignedUserIds = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
      const newTask = {
        _id: '64t' + Date.now().toString(16),
        title: template.title,
        description: template.description,
        priority: template.priority,
        status: 'todo',
        department: template.department,
        dueDate: dueDate || new Date(Date.now() + (template.defaultDueDateOffsetDays || 7) * 24 * 60 * 60 * 1000),
        assignedTo: assignedUserIds.map(uId => ({ _id: uId, name: 'Faculty Member', email: 'faculty@ssism.org' })),
        createdBy: { _id: req.user._id, name: req.user.name, email: req.user.email },
        createdAt: new Date().toISOString()
      };

      const { demoTasks } = require('../utils/mockStore');
      demoTasks.unshift(newTask);
      return res.status(201).json(newTask);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
