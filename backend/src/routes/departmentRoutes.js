const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getAdminDepartments,
  createDepartment,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
  assignHOD,
  changeHOD,
  getDepartmentFaculty,
  getDepartmentTaskStats,
  getAllHODs,
  getActivityLogs
} = require('../controllers/departmentController');
const { protect, admin } = require('../middleware/auth');

// Public/general routes (protected by token)
router.get('/', protect, getAllDepartments);

// Admin-only management routes
router.get('/admin/all', protect, admin, getAdminDepartments);
router.post('/', protect, admin, createDepartment);
router.get('/hods/all', protect, admin, getAllHODs);
router.get('/activity-logs', protect, admin, getActivityLogs);

router.get('/:id', protect, admin, getDepartmentById);
router.put('/:id', protect, admin, updateDepartment);
router.patch('/:id/status', protect, admin, toggleDepartmentStatus);
router.post('/:id/assign-hod', protect, admin, assignHOD);
router.post('/:id/change-hod', protect, admin, changeHOD);
router.get('/:id/faculty', protect, admin, getDepartmentFaculty);
router.get('/:id/tasks/stats', protect, admin, getDepartmentTaskStats);

module.exports = router;
