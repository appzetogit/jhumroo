import User from '../../../models/User.model.js';
import Reel from '../../../models/Reel.model.js';
import Follow from '../../../models/Follow.model.js';
import Like from '../../../models/Like.model.js';
import Comment from '../../../models/Comment.model.js';
import Report from '../../../models/Report.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get all users with pagination and filters
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    isVerified,
    isPrivate,
    isBanned,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  // Search by username, phone, or full name
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } }
    ];
  }

  // Filters
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';
  if (isPrivate !== undefined) query.isPrivate = isPrivate === 'true';
  if (isBanned !== undefined) query.isBanned = isBanned === 'true';
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(query)
    .select('-otp -deviceTokens')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    users
  });
});

/**
 * @desc    Get user details by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-otp -deviceTokens');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get additional stats
  const [reelsCount, followersCount, followingCount, likesReceived] = await Promise.all([
    Reel.countDocuments({ user: user._id }),
    Follow.countDocuments({ following: user._id }),
    Follow.countDocuments({ follower: user._id }),
    Like.countDocuments({ 
      reel: { $in: await Reel.find({ user: user._id }).distinct('_id') }
    })
  ]);

  res.status(200).json({
    success: true,
    user,
    stats: {
      reelsCount,
      followersCount,
      followingCount,
      likesReceived
    }
  });
});

/**
 * @desc    Update user details
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin (require permission: manage_users)
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, fullName, email, bio, isVerified, isPrivate } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if username is being changed
  if (username && username !== user.username) {
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }
    user.username = username.toLowerCase();
  }

  // Update fields
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) user.email = email;
  if (bio !== undefined) user.bio = bio;
  if (isVerified !== undefined) user.isVerified = isVerified;
  if (isPrivate !== undefined) user.isPrivate = isPrivate;

  await user.save();

  // Log activity
  req.admin.addActivity(
    'user_update',
    `Updated user: ${user.username}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    user
  });
});

/**
 * @desc    Ban/Unban user
 * @route   PUT /api/admin/users/:id/ban
 * @access  Private/Admin (require permission: ban_users)
 */
export const banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, duration } = req.body; // duration in days, 0 = permanent

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isBanned = !user.isBanned;

  if (user.isBanned) {
    user.banReason = reason || 'Violation of community guidelines';
    user.bannedAt = new Date();
    
    if (duration && duration > 0) {
      user.banExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    } else {
      user.banExpiresAt = null; // Permanent ban
    }
  } else {
    user.banReason = null;
    user.bannedAt = null;
    user.banExpiresAt = null;
  }

  await user.save();

  // Log activity
  req.admin.addActivity(
    user.isBanned ? 'user_banned' : 'user_unbanned',
    `${user.isBanned ? 'Banned' : 'Unbanned'} user: ${user.username}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`,
    user
  });
});

/**
 * @desc    Delete user and all associated data
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin (require permission: manage_users)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Delete all user data (reels, follows, likes, comments, etc.)
  await Promise.all([
    Reel.deleteMany({ user: user._id }),
    Follow.deleteMany({ $or: [{ follower: user._id }, { following: user._id }] }),
    Like.deleteMany({ user: user._id }),
    Comment.deleteMany({ user: user._id }),
    Report.deleteMany({ reportedBy: user._id })
  ]);

  // Delete user
  await user.deleteOne();

  // Log activity
  req.admin.addActivity(
    'user_deleted',
    `Deleted user: ${user.username}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'User and all associated data deleted successfully'
  });
});

/**
 * @desc    Get user's reels
 * @route   GET /api/admin/users/:id/reels
 * @access  Private/Admin
 */
export const getUserReels = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reels = await Reel.find({ user: id })
    .populate('user', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Reel.countDocuments({ user: id });

  res.status(200).json({
    success: true,
    count: reels.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    reels
  });
});

/**
 * @desc    Get user activity/analytics
 * @route   GET /api/admin/users/:id/activity
 * @access  Private/Admin
 */
export const getUserActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days = 30 } = req.query;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get activity stats
  const [
    recentReels,
    recentComments,
    recentLikes,
    recentFollows
  ] = await Promise.all([
    Reel.countDocuments({ user: id, createdAt: { $gte: startDate } }),
    Comment.countDocuments({ user: id, createdAt: { $gte: startDate } }),
    Like.countDocuments({ user: id, createdAt: { $gte: startDate } }),
    Follow.countDocuments({ follower: id, createdAt: { $gte: startDate } })
  ]);

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    activity: {
      reelsPosted: recentReels,
      commentsPosted: recentComments,
      likesGiven: recentLikes,
      newFollows: recentFollows,
      lastActive: user.lastActive || user.updatedAt
    }
  });
});

/**
 * @desc    Verify/Unverify user
 * @route   PUT /api/admin/users/:id/verify
 * @access  Private/Admin (require permission: manage_users)
 */
export const verifyUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isVerified = !user.isVerified;
  await user.save();

  // Log activity
  req.admin.addActivity(
    user.isVerified ? 'user_verified' : 'user_unverified',
    `${user.isVerified ? 'Verified' : 'Unverified'} user: ${user.username}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isVerified ? 'verified' : 'unverified'} successfully`,
    user
  });
});

/**
 * @desc    Bulk user operations
 * @route   POST /api/admin/users/bulk-action
 * @access  Private/Admin (require permission: manage_users)
 */
export const bulkUserAction = asyncHandler(async (req, res) => {
  const { userIds, action, data } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid user IDs'
    });
  }

  let result;

  switch (action) {
    case 'ban':
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { 
          isBanned: true,
          banReason: data?.reason || 'Bulk ban action',
          bannedAt: new Date()
        }
      );
      break;

    case 'unban':
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { 
          isBanned: false,
          banReason: null,
          bannedAt: null,
          banExpiresAt: null
        }
      );
      break;

    case 'verify':
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { isVerified: true }
      );
      break;

    case 'unverify':
      result = await User.updateMany(
        { _id: { $in: userIds } },
        { isVerified: false }
      );
      break;

    case 'delete':
      // Delete all related data first
      await Promise.all([
        Reel.deleteMany({ user: { $in: userIds } }),
        Follow.deleteMany({ 
          $or: [
            { follower: { $in: userIds } },
            { following: { $in: userIds } }
          ]
        }),
        Like.deleteMany({ user: { $in: userIds } }),
        Comment.deleteMany({ user: { $in: userIds } })
      ]);
      result = await User.deleteMany({ _id: { $in: userIds } });
      break;

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
  }

  // Log activity
  req.admin.addActivity(
    `bulk_${action}`,
    `Performed bulk ${action} on ${userIds.length} users`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: `Bulk action completed successfully`,
    affectedCount: result.modifiedCount || result.deletedCount
  });
});
