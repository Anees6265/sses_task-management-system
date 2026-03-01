import { Capacitor } from '@capacitor/core';
import { notificationAPI } from './api';

// Initialize push notifications (only works on mobile after package install)
export const initPushNotifications = async () => {
  console.log('Push notifications: Web version - using browser notifications only');
  // Mobile push notifications will work after installing @capacitor/push-notifications
  // and building the Android/iOS app
};

export const requestWebNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Web notification permission:', permission);
    });
  }
};
