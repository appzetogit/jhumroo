import Notification from '../../../models/Notification.model.js';
import Follow from '../../../models/Follow.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get all notifications for logged in user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Cleanup: Delete duplicate follow notifications for this user before fetching
  // This removes old duplicate data from the database
  const followNotifications = await Notification.find({ 
    recipient: req.user._id, 
    type: { $in: ['follow', 'follow_request', 'follow_accept', 'follow_back'] } 
  }).sort({ createdAt: -1 });

  const seenSenders = new Set();
  const idsToDelete = [];

  followNotifications.forEach(n => {
    const key = `${n.sender.toString()}-${n.type}`;
    if (seenSenders.has(key)) {
      idsToDelete.push(n._id);
    } else {
      seenSenders.add(key);
    }
  });

  if (idsToDelete.length > 0) {
    await Notification.deleteMany({ _id: { $in: idsToDelete } });
  }

  const notifications = await Notification.find({ 
    recipient: req.user._id,
    type: { $ne: 'follow_request' }
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'username fullName profilePicture isVerified')
    .populate('reel', 'video thumbnail stats')
    .lean();

  // Add following and follower status to senders
  const senderIds = notifications.map(n => n.sender?._id).filter(id => !!id);
  
  let finalNotifications = notifications;

  if (senderIds.length > 0) {
    const [follows, incomingFollows] = await Promise.all([
      Follow.find({
        follower: req.user._id,
        following: { $in: senderIds }
      }),
      Follow.find({
        follower: { $in: senderIds },
        following: req.user._id,
        status: 'accepted'
      })
    ]);

    const followStatusMap = new Map();
    follows.forEach(f => followStatusMap.set(f.following.toString(), f.status));

    const incomingFollowsSet = new Set(
      incomingFollows.map(f => f.follower.toString())
    );

    const idsToDeleteOnFly = [];

    notifications.forEach(n => {
      if (n.sender) {
        const status = followStatusMap.get(n.sender._id.toString());
        n.sender.isFollowing = status === 'accepted';
        n.sender.followStatus = status || null;
        n.sender.isFollower = incomingFollowsSet.has(n.sender._id.toString());

        // If it's a follow/follow_back notification, but neither follows each other,
        // it means they have both unfollowed. Clean it up from the database and filter it out.
        if (['follow', 'follow_back'].includes(n.type) && !n.sender.isFollowing && !n.sender.isFollower) {
          idsToDeleteOnFly.push(n._id);
        }
      }
    });

    if (idsToDeleteOnFly.length > 0) {
      // Delete from database in background
      Notification.deleteMany({ _id: { $in: idsToDeleteOnFly } }).exec().catch(err => {
        console.error('Failed to delete dangling notifications:', err);
      });
      finalNotifications = notifications.filter(n => !idsToDeleteOnFly.includes(n._id));
    }
  }

  const total = await Notification.countDocuments({ 
    recipient: req.user._id,
    type: { $ne: 'follow_request' }
  });

  res.status(200).json({
    success: true,
    notifications: finalNotifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  res.status(200).json({
    success: true,
    notification
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

/**
 * @desc    Get unread notifications count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ 
    recipient: req.user._id, 
    isRead: false 
  });

  res.status(200).json({
    success: true,
    count
  });
});
