import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socketInstance = null;

    const connectSocket = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) return;

      const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-management-system.onrender.com/api';
      const socketUrl = API_URL.replace('/api', '');

      console.log('🔌 Connecting to Socket.IO:', socketUrl);

      socketInstance = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 20,
        timeout: 20000,
        forceNew: true
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance.id);
        setConnected(true);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error.message);
      });

      socketInstance.on('online-users', (users) => {
        console.log('👥 Online users:', users.length);
        setOnlineUsers(users);
      });

      socketInstance.on('user-online', ({ userId }) => {
        setOnlineUsers(prev => [...new Set([...prev, userId])]);
      });

      socketInstance.on('user-offline', ({ userId }) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      setSocket(socketInstance);
    };

    connectSocket();

    const checkInterval = setInterval(() => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token && (!socketInstance || !socketInstance.connected)) {
        if (!socketInstance) {
          connectSocket();
        }
      }
    }, 3000);

    return () => {
      clearInterval(checkInterval);
      if (socketInstance) {
        socketInstance.close();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
