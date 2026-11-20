import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { notifyDataRefresh } from '../utils/eventBus.js';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let newSocket = null;

    const connectSocket = () => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No valid token found, skipping socket connection');
        setConnected(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const socketUrl = API_URL.replace(/\/api\/?$/, '');

      console.log('🔌 Connecting to Socket.IO:', socketUrl);

      newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 15,
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
        setConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
      });

      newSocket.on('online-users', (users) => {
        console.log('👥 Online users:', users.length);
        setOnlineUsers(users || []);
      });

      newSocket.on('user-online', ({ userId }) => {
        console.log('✅ User online:', userId);
        if (userId) setOnlineUsers(prev => [...new Set([...prev, userId])]);
      });

      newSocket.on('user-offline', ({ userId }) => {
        console.log('❌ User offline:', userId);
        if (userId) setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      // Real-time task and leave synchronization listeners
      newSocket.on('tasks_updated', () => {
        console.log('⚡ Socket event: tasks_updated -> refreshing');
        notifyDataRefresh('tasks');
      });

      newSocket.on('task_created', () => {
        notifyDataRefresh('tasks');
      });

      newSocket.on('task_updated', () => {
        notifyDataRefresh('tasks');
      });

      newSocket.on('task_deleted', () => {
        notifyDataRefresh('tasks');
      });

      newSocket.on('leaves_updated', () => {
        console.log('⚡ Socket event: leaves_updated -> refreshing');
        notifyDataRefresh('leaves');
      });

      newSocket.on('leave_created', () => {
        notifyDataRefresh('leaves');
      });

      newSocket.on('leave_updated', () => {
        notifyDataRefresh('leaves');
      });

      newSocket.on('dashboard_update', () => {
        notifyDataRefresh('all');
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      if (newSocket) {
        console.log('🔌 Closing socket connection');
        newSocket.close();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
