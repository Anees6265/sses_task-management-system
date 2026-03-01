import { Capacitor } from '@capacitor/core';
import { notificationAPI } from './api';

// Initialize push notifications
export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not a native platform, using web notifications');
    return;
  }

  try {
    // For Capacitor, we'll use the PushNotifications plugin
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('📱 FCM Token:', token.value);
      // Save token to backend
      try {
        await notificationAPI.saveFCMToken(token.value);
        console.log('✅ FCM token saved to backend');
      } catch (error) {
        console.error('❌ Failed to save FCM token:', error);
      }
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error);
    });

    // Listen for push notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📨 Push notification received:', notification);
      // Show local notification
      showLocalNotification(notification.title, notification.body);
    });

    // Listen for notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('👆 Notification tapped:', notification);
      const data = notification.notification.data;
      
      // Navigate based on notification type
      if (data.type === 'chat') {
        // Navigate to chat
        window.location.href = '/chat';
      } else if (data.type === 'task') {
        // Navigate to tasks
        window.location.href = '/';
      }
    });

  } catch (error) {
    console.error('❌ Push notification setup error:', error);
  }
};

// Show local notification (for when app is in foreground)
const showLocalNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'app-notification',
      requireInteraction: false
    });
  }
};

// Request web notification permission
export const requestWebNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Web notification permission:', permission);
    });
  }
};
