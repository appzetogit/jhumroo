import { Server } from 'socket.io';
import User from '../models/User.model.js';
import Conversation from '../models/Conversation.model.js';
import { verifyAccessToken } from '../middleware/auth.js';
import LiveStream from '../models/LiveStream.model.js';
import LiveComment from '../models/LiveComment.model.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedis } from './redis.js';

// With REDIS_URL, API processes (PM2 cluster) emit through Redis to the single socket process,
// and online presence lives in a Redis set so any process can read it.
const ONLINE_KEY = 'online_users';

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

  const redis = getRedis();
  if (redis) {
    io.adapter(createAdapter(redis, redis.duplicate()));
    // Only the process that owns the connections resets presence on boot (stale after a restart).
    if (process.env.ROLE !== 'api') redis.del(ONLINE_KEY).catch(() => {});
  }

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      // Verify token
      const decoded = verifyAccessToken(token);

      // Get user from database
      const user = await User.findById(decoded.id).select('-otp -deviceTokens');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      if (!user.isActive || user.isBanned) {
        return next(new Error('Authentication error: Account is inactive or banned'));
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

    // Guard every handler below: a malformed client event (missing payload, wrong types) must never
    // throw out of a listener — a sync throw or rejected promise there would take the whole server down.
    const rawOn = socket.on.bind(socket);
    socket.on = (event, handler) => rawOn(event, (payload, ...rest) => {
      const safePayload = (payload && typeof payload === 'object') || event === 'join_conversation' || event === 'leave_conversation' || event === 'disconnect' || event === 'error'
        ? payload : {};
      try {
        const r = handler(safePayload, ...rest);
        if (r && typeof r.catch === 'function') r.catch((err) => console.error(`[Socket] ${event} failed:`, err.message));
      } catch (err) {
        console.error(`[Socket] ${event} failed:`, err.message);
      }
    });
    console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);
    getRedis()?.sadd(ONLINE_KEY, userId).catch(() => {});

    // Join user's personal room (for private messages)
    socket.join(userId);

    // Live like/comment counts: the client says which reel is on screen; stats go only to that room.
    socket.on('watch_reel', (reelId) => {
      if (socket.data.watchReel) socket.leave(`reel:${socket.data.watchReel}`);
      socket.data.watchReel = typeof reelId === 'string' && reelId.length <= 64 ? reelId : null;
      if (socket.data.watchReel) socket.join(`reel:${socket.data.watchReel}`);
    });

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
    socket.on('join_conversation', async (conversationId) => {
      // Only participants may listen to a conversation's room
      const isMember = await Conversation.exists({ _id: conversationId, participants: userId }).catch(() => null);
      if (!isMember) return;
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
      // Only the stream's real owner can become its broadcaster (else anyone could hijack a live).
      const stream = await LiveStream.findById(liveId).select('broadcaster status').lean().catch(() => null);
      if (!stream || stream.broadcaster?.toString() !== userId || stream.status === 'ended') return;
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
      // Only real, running lives — otherwise random ids would pile up empty rooms in memory.
      if (!liveRooms.has(liveId)) {
        const live = await LiveStream.exists({ _id: liveId, status: 'live' }).catch(() => null);
        if (!live) return;
      }
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
        const isNewViewer = !room.viewers.has(socket.id);
        room.viewers.set(socket.id, {
          userId,
          user: socket.user
        });

        if (!socketToLives.has(socket.id)) {
          socketToLives.set(socket.id, new Set());
        }
        socketToLives.get(socket.id).add(liveId);

        const currentCount = room.viewers.size;

        if (isNewViewer) {
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
        }

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
    // Signaling is only relayed between a live's registered broadcaster and its viewers,
    // so nobody can push a fake stream/answer to sockets of a live they don't own.
    const isBroadcasterOf = (liveId) => liveRooms.get(liveId)?.broadcasterSocketId === socket.id;
    const isViewerOf = (liveId, sid) => !!liveRooms.get(liveId)?.viewers.has(sid);

    socket.on('live_offer', ({ toViewerSocketId, sdp, liveId }) => {
      if (toViewerSocketId && sdp && isBroadcasterOf(liveId) && isViewerOf(liveId, toViewerSocketId)) {
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
      if (toBroadcasterSocketId && sdp && isViewerOf(liveId, socket.id) &&
          liveRooms.get(liveId)?.broadcasterSocketId === toBroadcasterSocketId) {
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
      const room = liveRooms.get(liveId);
      const allowed = room && (
        (room.broadcasterSocketId === socket.id && room.viewers.has(targetSocketId)) ||
        (room.viewers.has(socket.id) && room.broadcasterSocketId === targetSocketId)
      );
      if (targetSocketId && candidate && allowed) {
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
      if (!liveId || typeof text !== 'string' || !text.trim() || text.length > 300) return;
      if (!socket.rooms.has(`live_${liveId}`)) return; // must actually be in this live

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
      getRedis()?.srem(ONLINE_KEY, userId).catch(() => {});

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

/** Which of these user ids are online — works from any process (Redis when configured). */
export const getOnlineSet = async (userIds) => {
  const ids = userIds.map(String);
  const redis = getRedis();
  if (!redis || !ids.length) return new Set(ids.filter((id) => onlineUsers.has(id)));
  const flags = await redis.smismember(ONLINE_KEY, ...ids);
  return new Set(ids.filter((_, i) => flags[i]));
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
// Every socket joins its userId room, so a room emit reaches the user from any process (no-op if offline).
export const sendToUser = (userId, event, data) => {
  if (!io) return false;
  io.to(String(userId)).emit(event, data);
  return true;
};

/**
 * Send event to multiple users
 */
export const sendToUsers = (userIds, event, data) => {
  if (!io) return;
  
  if (userIds.length) io.to(userIds.map(String)).emit(event, data);
};

export default { initSocket, getIO, isUserOnline, getOnlineUsersCount, sendToUser, sendToUsers };
