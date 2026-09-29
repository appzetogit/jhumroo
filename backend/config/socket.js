import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import LiveStream from '../models/LiveStream.model.js';
import LiveComment from '../models/LiveComment.model.js';

let io;

// Store online users with their socket IDs
const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

// Live Rooms Map: liveId -> { broadcasterSocketId, broadcasterUserId, viewers: Map(socketId -> userInfo) }
const liveRooms = new Map();
// Socket to Live Stream mapping for clean disconnect handling
const socketToLives = new Map(); // socketId -> Set of liveIds

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

    // Broadcast user is online to their contacts if active status is enabled
    if (socket.user?.activeStatusPrivacy !== 'no_one') {
      socket.broadcast.emit('user_online', { userId });
    }

    /**
     * Handle active status privacy change in real-time
     */
    socket.on('update_active_status_privacy', ({ activeStatusPrivacy }) => {
      if (socket.user) {
        socket.user.activeStatusPrivacy = activeStatusPrivacy;
      }
      if (activeStatusPrivacy === 'no_one') {
        socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() });
      } else {
        socket.broadcast.emit('user_online', { userId });
      }
    });

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
     * Handle live location updates
     */
    socket.on('update_location', async ({ latitude, longitude }) => {
      try {
        if (latitude !== undefined && longitude !== undefined) {
          await User.findByIdAndUpdate(userId, {
            liveLocation: {
              type: 'Point',
              coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
            }
          });
        }
      } catch (error) {
        console.error(`Error updating live location for user ${userId}:`, error);
      }
    });

    /**
     * ==========================================
     * LIVE STREAMING & WebRTC SIGNALING HANDLERS
     * ==========================================
     */

    /**
     * Broadcaster registers its socket for the live stream
     */
    socket.on('broadcaster_register', async ({ liveId }) => {
      if (!liveId) return;
      socket.join(`live_${liveId}`);

      let room = liveRooms.get(liveId);
      if (!room) {
        room = {
          broadcasterSocketId: socket.id,
          broadcasterUserId: userId,
          viewers: new Map()
        };
        liveRooms.set(liveId, room);
      } else {
        room.broadcasterSocketId = socket.id;
        room.broadcasterUserId = userId;
      }

      if (!socketToLives.has(socket.id)) {
        socketToLives.set(socket.id, new Set());
      }
      socketToLives.get(socket.id).add(liveId);

      console.log(`🎙️ Broadcaster registered for live ${liveId} (Socket: ${socket.id})`);
    });

    /**
     * Viewer joins a live stream room
     */
    socket.on('join_live_room', async ({ liveId }) => {
      if (!liveId) return;
      socket.join(`live_${liveId}`);

      let room = liveRooms.get(liveId);
      if (!room) {
        room = {
          broadcasterSocketId: null,
          broadcasterUserId: null,
          viewers: new Map()
        };
        liveRooms.set(liveId, room);
      }

      // Add to room viewers (if not broadcaster)
      const isBroadcaster = room.broadcasterUserId === userId || room.broadcasterSocketId === socket.id;
      if (!isBroadcaster) {
        room.viewers.set(socket.id, {
          userId,
          user: socket.user
        });

        if (!socketToLives.has(socket.id)) {
          socketToLives.set(socket.id, new Set());
        }
        socketToLives.get(socket.id).add(liveId);

        const currentCount = room.viewers.size;

        // Update database with current & peak viewers + unique viewer
        try {
          await LiveStream.findByIdAndUpdate(liveId, {
            currentViewersCount: currentCount,
            $max: { peakViewers: currentCount },
            $addToSet: { totalUniqueViewers: userId }
          });
        } catch (dbErr) {
          console.error('Error updating live viewers in DB:', dbErr);
        }

        // Broadcast updated viewer count to room
        io.to(`live_${liveId}`).emit('live_viewers_count', {
          liveId,
          count: currentCount
        });

        // Notify room that user joined
        socket.to(`live_${liveId}`).emit('user_joined_live', {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            profilePicture: socket.user.profilePicture
          }
        });

        // Notify broadcaster that a new viewer joined so broadcaster initiates WebRTC offer
        if (room.broadcasterSocketId) {
          io.to(room.broadcasterSocketId).emit('viewer_joined_stream', {
            viewerSocketId: socket.id,
            user: {
              _id: socket.user._id,
              username: socket.user.username,
              fullName: socket.user.fullName,
              profilePicture: socket.user.profilePicture
            }
          });
        }
      }
    });

    /**
     * Viewer leaves a live stream room
     */
    socket.on('leave_live_room', async ({ liveId }) => {
      if (!liveId) return;
      socket.leave(`live_${liveId}`);

      const room = liveRooms.get(liveId);
      if (room) {
        if (room.viewers.has(socket.id)) {
          room.viewers.delete(socket.id);
          const currentCount = room.viewers.size;

          // Update DB
          LiveStream.findByIdAndUpdate(liveId, {
            currentViewersCount: currentCount
          }).catch(() => {});

          // Broadcast updated viewer count
          io.to(`live_${liveId}`).emit('live_viewers_count', {
            liveId,
            count: currentCount
          });

          // Notify broadcaster that viewer left to clean up WebRTC peer connection
          if (room.broadcasterSocketId) {
            io.to(room.broadcasterSocketId).emit('viewer_left_stream', {
              viewerSocketId: socket.id
            });
          }
        }
      }

      if (socketToLives.has(socket.id)) {
        socketToLives.get(socket.id).delete(liveId);
      }
    });

    /**
     * WebRTC Signaling: Live Offer (Broadcaster -> Viewer)
     */
    socket.on('live_offer', ({ toViewerSocketId, sdp, liveId }) => {
      if (toViewerSocketId && sdp) {
        io.to(toViewerSocketId).emit('live_offer', {
          fromBroadcasterSocketId: socket.id,
          sdp,
          liveId
        });
      }
    });

    /**
     * WebRTC Signaling: Live Answer (Viewer -> Broadcaster)
     */
    socket.on('live_answer', ({ toBroadcasterSocketId, sdp, liveId }) => {
      if (toBroadcasterSocketId && sdp) {
        io.to(toBroadcasterSocketId).emit('live_answer', {
          fromViewerSocketId: socket.id,
          sdp,
          liveId
        });
      }
    });

    /**
     * WebRTC Signaling: ICE Candidate (Bidirectional)
     */
    socket.on('live_ice_candidate', ({ targetSocketId, candidate, liveId }) => {
      if (targetSocketId && candidate) {
        io.to(targetSocketId).emit('live_ice_candidate', {
          fromSocketId: socket.id,
          candidate,
          liveId
        });
      }
    });

    /**
     * Real-time Live Comments
     */
    socket.on('send_live_comment', async ({ liveId, text }) => {
      if (!liveId || !text || !text.trim()) return;

      try {
        const comment = await LiveComment.create({
          liveStream: liveId,
          user: userId,
          text: text.trim()
        });

        await comment.populate('user', 'username fullName profilePicture isVerified');

        // Increment count in LiveStream
        await LiveStream.findByIdAndUpdate(liveId, {
          $inc: { commentsCount: 1 }
        });

        // Broadcast comment to entire live room
        io.to(`live_${liveId}`).emit('new_live_comment', comment);
      } catch (err) {
        console.error('Error saving live comment:', err);
      }
    });

    /**
     * Real-time Live Reactions (Hearts / Emojis)
     */
    socket.on('send_live_reaction', async ({ liveId, emoji }) => {
      if (!liveId) return;

      const reactionPayload = {
        id: Math.random().toString(36).substring(2, 9),
        emoji: emoji || '❤️',
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          profilePicture: socket.user.profilePicture
        },
        timestamp: Date.now()
      };

      // Broadcast reaction to room
      io.to(`live_${liveId}`).emit('new_live_reaction', reactionPayload);

      // Increment likesCount in background
      LiveStream.findByIdAndUpdate(liveId, {
        $inc: { likesCount: 1 }
      }).catch(() => {});
    });

    /**
     * Broadcaster ends live stream
     */
    socket.on('end_live_stream', async ({ liveId }) => {
      if (!liveId) return;

      try {
        const stream = await LiveStream.findById(liveId);
        if (stream && stream.broadcaster.toString() === userId) {
          stream.status = 'ended';
          stream.endedAt = new Date();
          stream.currentViewersCount = 0;
          await stream.save();

          io.to(`live_${liveId}`).emit('live_stream_ended', {
            liveId,
            endedAt: stream.endedAt,
            stats: {
              peakViewers: stream.peakViewers,
              totalUniqueViewers: stream.totalUniqueViewers.length,
              likesCount: stream.likesCount,
              commentsCount: stream.commentsCount,
              durationSeconds: Math.floor((stream.endedAt - stream.startedAt) / 1000)
            }
          });

          liveRooms.delete(liveId);
          io.emit('user_left_live', { liveId, broadcasterId: stream.broadcaster });
        }
      } catch (err) {
        console.error('Error ending live stream via socket:', err);
      }
    });


    /**
     * Handle user going offline
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);

      // Remove from online users
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);

      // Clean up any live rooms this socket was in
      if (socketToLives.has(socket.id)) {
        const liveIds = socketToLives.get(socket.id);
        liveIds.forEach(async (liveId) => {
          const room = liveRooms.get(liveId);
          if (room) {
            if (room.broadcasterSocketId === socket.id) {
              // Broadcaster disconnected
              console.log(`[Socket] Broadcaster disconnected from live ${liveId}`);
              io.to(`live_${liveId}`).emit('live_stream_ended', {
                liveId,
                message: 'Broadcaster disconnected'
              });
              liveRooms.delete(liveId);
              io.emit('user_left_live', { liveId, broadcasterId: room.broadcasterUserId || userId });
              try {
                await LiveStream.findByIdAndUpdate(liveId, {
                  status: 'ended',
                  endedAt: new Date(),
                  currentViewersCount: 0
                });
              } catch (err) {}
            } else if (room.viewers.has(socket.id)) {
              // Viewer disconnected
              room.viewers.delete(socket.id);
              const count = room.viewers.size;
              io.to(`live_${liveId}`).emit('live_viewers_count', {
                liveId,
                count
              });
              if (room.broadcasterSocketId) {
                io.to(room.broadcasterSocketId).emit('viewer_left_stream', {
                  viewerSocketId: socket.id
                });
              }
              try {
                await LiveStream.findByIdAndUpdate(liveId, {
                  currentViewersCount: count
                });
              } catch (err) {}
            }
          }
        });
        socketToLives.delete(socket.id);
      }

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
