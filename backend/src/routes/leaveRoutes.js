const express = require('express');
const router = express.Router();
const { 
  applyLeave, 
  getLeaves, 
  updateLeaveStatus, 
  getLeaveStats, 
  getDailyAttendance,
  cancelLeave 
} = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', applyLeave);
router.get('/', getLeaves);
router.get('/stats', getLeaveStats);
router.get('/attendance', getDailyAttendance);
router.put('/:id/status', updateLeaveStatus);
router.delete('/:id', cancelLeave);

module.exports = router;
