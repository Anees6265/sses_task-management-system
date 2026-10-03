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
  getFacultyTaskHistory,
  assignFacultyDepartment,
  removeFacultyDepartment,
  getUnassignedFaculty
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, getAllUsers);
router.get('/workload', protect, getFacultyWorkload);
router.get('/performance', protect, getFacultyPerformance);
router.get('/unassigned', protect, getUnassignedFaculty);
router.get('/:id/history', protect, getFacultyTaskHistory);

router.post('/', protect, admin, createUser);
router.put('/:id/department', protect, updateUserDepartment);
router.put('/:id/assign-department', protect, assignFacultyDepartment);
router.put('/:id/remove-department', protect, removeFacultyDepartment);
router.put('/:id', protect, updateUser);
router.patch('/:id/status', protect, toggleUserStatus);

module.exports = router;


