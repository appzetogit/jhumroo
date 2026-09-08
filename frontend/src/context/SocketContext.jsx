import React, { createContext, useContext, useEffect, useState } from 'react'; 

import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to socket server
      const rawApiUrl = import.meta.env.VITE_API_URL || '';
      const socketUrl = rawApiUrl.startsWith('http') 
        ? rawApiUrl 
        : window.location.origin;

      const newSocket = io(socketUrl, {
        auth: {
          token
        }
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
      });

      newSocket.on('connect_error', (error) => {
        if (error?.message?.includes('Authentication error') || error?.message?.includes('User not found')) {
          console.warn('Socket auth invalid:', error.message);
          newSocket.disconnect();
        } else {
          console.error('Socket connection error:', error);
        }
      });

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
