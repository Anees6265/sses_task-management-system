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
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v.endsWith('@ssism.org');
      },
      message: 'Email must be from @ssism.org domain'
    }
  },
  password: {
    type: String,
    minlength: 6
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
      return this.role !== 'admin';
    }
  },
  role: {
    type: String,
    enum: ['admin', 'hod', 'user'],
    default: 'user'
  },
  phoneNumber: {
    type: String,
    trim: true
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
