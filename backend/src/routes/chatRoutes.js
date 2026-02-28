const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
} = require('../controllers/chatController');

router.use(protect);

router.get('/conversations', getConversations);
router.get('/messages/:userId', getMessages);
router.post('/send', sendMessage);
router.put('/read/:userId', markAsRead);

module.exports = router;
