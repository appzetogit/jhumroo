import LiveStream from '../../../models/LiveStream.model.js';
import LiveComment from '../../../models/LiveComment.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { notifyFollowersLive } from '../../../utils/notificationService.js';
import { getIceServersConfig } from '../../../services/turnService.js';
import { getIO } from '../../../config/socket.js';

/**
 * @desc    Start a new live stream
 * @route   POST /api/live/start
 * @access  Private
 */
export const startLive = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { title, thumbnailUrl } = req.body;

  // Mark any previous active live stream for this user as ended
  await LiveStream.updateMany(
    { broadcaster: userId, status: 'live' },
    { status: 'ended', endedAt: new Date() }
  );

  const liveStream = await LiveStream.create({
    broadcaster: userId,
    title: title?.trim() || 'Going Live on Jhumroo',
    thumbnailUrl: thumbnailUrl || '',
    status: 'live',
    startedAt: new Date(),
    currentViewersCount: 0,
    peakViewers: 0,
    likesCount: 0,
    commentsCount: 0
  });

  await liveStream.populate('broadcaster', 'username fullName profilePicture isVerified');

  // Asynchronously notify followers via Push & In-app notifications
  notifyFollowersLive({
    broadcasterId: userId,
    liveStreamId: liveStream._id,
    title: liveStream.title
  }).catch((err) => {
    console.error('Failed to notify followers for live stream:', err);
  });

  // Broadcast real-time event to all connected sockets that user went live
  try {
    const io = getIO();
    io.emit('user_went_live', {
      liveId: liveStream._id,
      broadcaster: liveStream.broadcaster,
      title: liveStream.title,
      startedAt: liveStream.startedAt
    });
  } catch (socketErr) {
    console.error('Socket broadcast error on live start:', socketErr);
  }

  res.status(201).json({
    success: true,
    message: 'Live stream started successfully',
    liveStream
  });
});

/**
 * @desc    End a live stream
 * @route   POST /api/live/:id/end
 * @access  Private
 */
export const endLive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const liveStream = await LiveStream.findById(id);

  if (!liveStream) {
    return res.status(404).json({
      success: false,
      message: 'Live stream not found'
    });
  }

  if (liveStream.broadcaster.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to end this live stream'
    });
  }

  liveStream.status = 'ended';
  liveStream.endedAt = new Date();
  liveStream.currentViewersCount = 0;
  await liveStream.save();

  // Notify socket room that the stream ended
  try {
    const io = getIO();
    io.to(`live_${id}`).emit('live_stream_ended', {
      liveId: id,
      endedAt: liveStream.endedAt,
      stats: {
        peakViewers: liveStream.peakViewers,
        totalUniqueViewers: liveStream.totalUniqueViewers.length,
        likesCount: liveStream.likesCount,
        commentsCount: liveStream.commentsCount,
        durationSeconds: Math.floor((liveStream.endedAt - liveStream.startedAt) / 1000)
      }
    });
    io.emit('user_left_live', { liveId: id });
  } catch (socketErr) {
    console.error('Socket emit error on live end:', socketErr);
  }

  res.status(200).json({
    success: true,
    message: 'Live stream ended successfully',
    liveStream,
    summary: {
      peakViewers: liveStream.peakViewers,
      totalViewers: liveStream.totalUniqueViewers.length,
      likesCount: liveStream.likesCount,
      commentsCount: liveStream.commentsCount,
      durationSeconds: Math.floor((liveStream.endedAt - liveStream.startedAt) / 1000)
    }
  });
});

/**
 * @desc    Get all active live streams
 * @route   GET /api/live/active
 * @access  Public
 */
export const getActiveLives = asyncHandler(async (req, res) => {
  const lives = await LiveStream.find({ status: 'live' })
    .populate('broadcaster', 'username fullName profilePicture isVerified stats')
    .sort({ currentViewersCount: -1, startedAt: -1 })
    .limit(30)
    .lean();

  res.status(200).json({
    success: true,
    count: lives.length,
    liveStreams: lives
  });
});

/**
 * @desc    Get live stream details by ID
 * @route   GET /api/live/:id
 * @access  Public
 */
export const getLiveById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const liveStream = await LiveStream.findById(id)
    .populate('broadcaster', 'username fullName profilePicture isVerified stats')
    .lean();

  if (!liveStream) {
    return res.status(404).json({
      success: false,
      message: 'Live stream not found'
    });
  }

  res.status(200).json({
    success: true,
    liveStream
  });
});

/**
 * @desc    Get comments for a live stream
 * @route   GET /api/live/:id/comments
 * @access  Public
 */
export const getLiveComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit, 10) || 50;

  const comments = await LiveComment.find({ liveStream: id })
    .populate('user', 'username fullName profilePicture isVerified')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    comments: comments.reverse()
  });
});

/**
 * @desc    Get STUN & Coturn TURN ICE server configuration
 * @route   GET /api/live/ice-servers
 * @access  Private
 */
export const getIceServers = asyncHandler(async (req, res) => {
  const userId = req.user?._id?.toString() || 'user';
  const config = getIceServersConfig(userId);

  res.status(200).json({
    success: true,
    ...config
  });
});
