const express = require('express');
const router = express.Router();
const { getAllDepartments } = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllDepartments);

module.exports = router;
