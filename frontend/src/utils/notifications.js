// Simple notification utility for chat messages
export const showNotification = (title, body, icon = '/icon-192.png') => {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  // Check notification permission
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: 'chat-message',
      requireInteraction: false,
      silent: false
    });
  } else if (Notification.permission !== 'denied') {
    // Request permission
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon,
          badge: icon,
          tag: 'chat-message',
          requireInteraction: false,
          silent: false
        });
      }
    });
  }
};

// Request notification permission on app start
export const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};