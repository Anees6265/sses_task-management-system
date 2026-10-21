import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../services/api';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      console.log('⚠️ No token found, skipping socket connection');
      return;
    }

    // Dynamic socket URL based on environment
    const socketUrl = getSocketUrl();

    console.log('🔌 Connecting to Socket.IO:', socketUrl);
    console.log('🔑 Using token:', token.substring(0, 20) + '...');

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
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
