const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, getDashboardStats } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

// Handle OPTIONS preflight requests BEFORE protect middleware
router.options('*', (req, res) => res.sendStatus(200));

router.use(protect);

router.get('/stats', getDashboardStats);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;
