import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || 'https://sses-task-management-system.onrender.com/api';
    const socketUrl = API_URL.replace('/api', '');

    console.log('🔌 Connecting to Socket.IO:', socketUrl);

    const accessToken = localStorage.getItem('accessToken') || token;

    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt:', attemptNumber);
    });

    newSocket.on('online-users', (users) => {
      console.log('👥 Online users:', users.length);
      setOnlineUsers(users);
    });

    newSocket.on('user-online', ({ userId }) => {
      console.log('✅ User online:', userId);
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    newSocket.on('user-offline', ({ userId }) => {
      console.log('❌ User offline:', userId);
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Closing socket connection');
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
