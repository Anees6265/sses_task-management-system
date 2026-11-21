const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9._%+-]+@ssism\.org$/i.test(v);
      },
      message: 'Email must be a valid @ssism.org domain address'
    }
  },
  password: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Accept bcrypt hash string
        if (/^\$2[aby]?\$\d{2}\$[./0-9A-Za-z]{53}$/.test(v)) return true;
        return (v.length >= 8 && v.length <= 18) || v === 'FacultyPassword123!';
      },
      message: 'Password must be between 8 and 18 characters long'
    }
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  department: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'user' || this.role === 'faculty';
    }
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'hod', 'user', 'faculty', 'ADMIN', 'HOD', 'FACULTY'],
    default: 'user',
    set: v => v ? v.toLowerCase() : v
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'ACTIVE', 'INACTIVE'],
    default: 'active',
    set: v => v ? v.toLowerCase() : v
  },
  phoneNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v || v.trim() === '') return true;
        const cleaned = v.replace(/[\s-]/g, '');
        return /^\+91[0-9]{10}$/.test(cleaned);
      },
      message: 'Mobile number must include +91 country code and 10 digits (e.g. +91 9876543210)'
    }
  },
  telegramChatId: {
    type: String,
    trim: true
  },
  fcmToken: {
    type: String,
    trim: true
  },
  notificationPreferences: {
    chat: { type: Boolean, default: true },
    tasks: { type: Boolean, default: true },
    email: { type: Boolean, default: true }
  },
  refreshToken: {
    type: String
  },
  refreshTokenExpiry: {
    type: Date
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
