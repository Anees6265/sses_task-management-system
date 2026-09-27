const mongoose = require('mongoose');

const taskTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  defaultDueDateOffsetDays: {
    type: Number,
    default: 7
  },
  tags: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('TaskTemplate', taskTemplateSchema);
