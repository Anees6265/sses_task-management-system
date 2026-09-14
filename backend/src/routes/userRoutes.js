const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserDepartment } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, getAllUsers);
router.put('/:id/department', protect, admin, updateUserDepartment);

module.exports = router;
