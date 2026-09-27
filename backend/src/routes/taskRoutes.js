const express = require('express');
const router = express.Router();
const { 
  getTasks, 
  getTasksByFaculty, 
  createTask, 
  updateTask, 
  deleteTask, 
  getDashboardStats,
  reassignTask,
  addComment,
  getComments,
  uploadAttachment,
  deleteAttachment
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Handle OPTIONS preflight requests BEFORE protect middleware
router.options('*', (req, res) => res.sendStatus(200));

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/faculty/:facultyId', getTasksByFaculty);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .put(updateTask)
  .delete(deleteTask);

router.post('/:id/reassign', reassignTask);

router.route('/:id/comments')
  .get(getComments)
  .post(addComment);

router.post('/:id/attachments', upload.single('attachment'), uploadAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

module.exports = router;
