const express = require('express');
const router = express.Router();
const { saveFCMToken, updateNotificationPreferences } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.post('/fcm-token', protect, saveFCMToken);
router.put('/preferences', protect, updateNotificationPreferences);

module.exports = router;
