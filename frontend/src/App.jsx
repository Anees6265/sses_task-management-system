import React, { useContext, useEffect } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { requestNotificationPermission } from './utils/notifications';
import { initPushNotifications, requestWebNotificationPermission } from './services/pushNotifications';
import Login from './components/Login.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import TokenExpiryWarning from './components/TokenExpiryWarning.jsx';

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      // Initialize notifications when user is logged in
      requestNotificationPermission();
      requestWebNotificationPermission();
      initPushNotifications();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-2xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SocketProvider>
      <TokenExpiryWarning />
      <KanbanBoard />
    </SocketProvider>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
