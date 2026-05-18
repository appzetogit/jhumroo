import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

let io;

// Store online users with their socket IDs
const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

/**
 * Initialize Socket.io
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalIp = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5003',
          'http://localhost:3000',
          'https://jhumroo.in',
          'https://www.jhumroo.in',
          process.env.CLIENT_URL
        ].filter(o => o);
        
        if (
          allowedOrigins.indexOf(origin) !== -1 || 
          allowedOrigins.includes(origin) ||
          (isDevelopment && isLocalIp)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-otp -deviceTokens');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);

    // Join user's personal room (for private messages)
    socket.join(userId);

    // Broadcast user is online to their contacts
    socket.broadcast.emit('user_online', { userId });

    /**
     * Handle typing indicator
     */
    socket.on('typing_start', ({ conversationId, receiverId }) => {
      if (receiverId) {
        io.to(receiverId).emit('user_typing', {
          conversationId,
          userId,
          isTyping: true
        });
      }
    });

    socket.on('typing_stop', ({ conversationId, receiverId }) => {
      if (receiverId) {
        io.to(receiverId).emit('user_typing', {
          conversationId,
          userId,
          isTyping: false
        });
      }
    });

    /**
     * Handle join conversation room
     */
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    /**
     * Handle message delivery confirmation
     */
    socket.on('message_delivered', ({ messageId, conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('message_status', {
        messageId,
        status: 'delivered',
        deliveredAt: new Date()
      });
    });

    /**
     * Handle user going offline
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);

      // Remove from online users
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);

      // Broadcast user is offline
      socket.broadcast.emit('user_offline', {
        userId,
        lastSeen: new Date()
      });
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 Socket.io initialized');

  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

/**
 * Get online users count
 */
export const getOnlineUsersCount = () => {
  return onlineUsers.size;
};

/**
 * Get all online user IDs
 */
export const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

/**
 * Send event to specific user
 */
export const sendToUser = (userId, event, data) => {
  if (io && onlineUsers.has(userId)) {
    io.to(userId).emit(event, data);
    return true;
  }
  return false;
};

/**
 * Send event to multiple users
 */
export const sendToUsers = (userIds, event, data) => {
  if (!io) return;
  
  userIds.forEach(userId => {
    if (onlineUsers.has(userId)) {
      io.to(userId).emit(event, data);
    }
  });
};

export default { initSocket, getIO, isUserOnline, getOnlineUsersCount, sendToUser, sendToUsers };
