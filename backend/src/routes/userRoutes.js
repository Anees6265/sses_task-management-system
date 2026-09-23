const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  updateUserDepartment, 
  createUser,
  updateUser,
  toggleUserStatus,
  getFacultyWorkload,
  getFacultyPerformance,
  getFacultyTaskHistory
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, getAllUsers);
router.get('/workload', protect, getFacultyWorkload);
router.get('/performance', protect, getFacultyPerformance);
router.get('/:id/history', protect, getFacultyTaskHistory);

router.post('/', protect, admin, createUser);
router.put('/:id/department', protect, admin, updateUserDepartment);
router.put('/:id', protect, updateUser);
router.patch('/:id/status', protect, toggleUserStatus);

module.exports = router;


