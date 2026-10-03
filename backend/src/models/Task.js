const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['todo', 'inprogress', 'completed'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  department: {
    type: String,
    required: function() {
      return !this.isPersonal;
    },
    trim: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPersonal: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  comments: [{
    text: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    createdAt: { type: Date, default: Date.now }
  }],
  assignmentHistory: [{
    previousAssignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    newAssignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reassignedByName: String,
    reassignedAt: { type: Date, default: Date.now }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom', 'none'],
    default: 'none'
  },
  recurrenceInterval: {
    type: Number,
    default: 1
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskTemplate'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
