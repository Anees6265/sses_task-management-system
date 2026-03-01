const User = require('../models/User');

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

    // For now, we'll use the socket.io to send notifications
    // In production, integrate with Firebase Admin SDK
    console.log('📲 Push notification:', { userId, title, body });
    
    // TODO: Integrate Firebase Admin SDK
    // const message = {
    //   notification: { title, body },
    //   data,
    //   token: user.fcmToken
    // };
    // await admin.messaging().send(message);
    
  } catch (error) {
    console.error('Push notification error:', error);
  }
};

module.exports = { saveFCMToken, updateNotificationPreferences, sendPushNotification };
