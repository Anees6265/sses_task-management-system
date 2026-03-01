const User = require('../models/User');
const admin = require('../config/firebase');

// Store FCM token
const saveFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user.id, { fcmToken });
    res.json({ message: 'FCM token saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving FCM token', error: error.message });
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    const { chat, tasks, email } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      notificationPreferences: { chat, tasks, email }
    });
    res.json({ message: 'Notification preferences updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
};

// Send push notification helper
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.log('No FCM token for user:', userId);
      return;
    }

    // Check if user has enabled task notifications
    if (!user.notificationPreferences?.tasks) {
      console.log('Task notifications disabled for user:', userId);
      return;
    }

    // Check if Firebase Admin is initialized
    if (!admin.apps || admin.apps.length === 0) {
      console.log('Firebase Admin not initialized - skipping push notification');
      return;
    }

    // Send push notification via Firebase
    const message = {
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token: user.fcmToken
    };

    await admin.messaging().send(message);
    console.log('✅ Push notification sent to:', user.name);
    
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    // Don't throw error - notification failure shouldn't break the app
  }
};

module.exports = { saveFCMToken, updateNotificationPreferences, sendPushNotification };
