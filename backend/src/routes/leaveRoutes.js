const express = require('express');
const router = express.Router();
const { 
  applyLeave, 
  getLeaves, 
  updateLeaveStatus, 
  getLeaveStats, 
  getDailyAttendance,
  cancelLeave,
  getSundayAttendance,
  toggleSundayAttendance,
  getHolidays,
  announceHoliday,
  deleteHoliday
} = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', applyLeave);
router.get('/', getLeaves);
router.get('/stats', getLeaveStats);
router.get('/attendance', getDailyAttendance);
router.get('/sunday-attendance', getSundayAttendance);
router.post('/sunday-attendance/toggle', toggleSundayAttendance);
router.get('/holidays', getHolidays);
router.post('/holidays', announceHoliday);
router.delete('/holidays/:id', deleteHoliday);
router.put('/:id/status', updateLeaveStatus);
router.delete('/:id', cancelLeave);

module.exports = router;
