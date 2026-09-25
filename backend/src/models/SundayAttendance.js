const mongoose = require('mongoose');

const sundayAttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // 'YYYY-MM-DD' formatted date string
    required: true
  },
  isPresent: {
    type: Boolean,
    default: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  note: {
    type: String,
    default: 'Sunday Duty'
  }
}, {
  timestamps: true
});

sundayAttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SundayAttendance', sundayAttendanceSchema);
