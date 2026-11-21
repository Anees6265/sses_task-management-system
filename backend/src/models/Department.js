const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'ACTIVE', 'INACTIVE'],
    default: 'active',
    set: v => v ? v.toLowerCase() : v
  },
  hodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Pre-save hook to ensure hodId and hod stay synchronized
departmentSchema.pre('save', function(next) {
  if (this.hodId && !this.hod) {
    this.hod = this.hodId;
  } else if (this.hod && !this.hodId) {
    this.hodId = this.hod;
  }
  next();
});

// Indexes for performance and uniqueness
departmentSchema.index({ code: 1 }, { unique: true });
departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ hodId: 1 });
departmentSchema.index({ status: 1 });

module.exports = mongoose.model('Department', departmentSchema);
