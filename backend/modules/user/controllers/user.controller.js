import User from '../../../models/User.model.js';
import Reel from '../../../models/Reel.model.js';
import Follow from '../../../models/Follow.model.js';
import Like from '../../../models/Like.model.js';
import SavedReel from '../../../models/SavedReel.model.js';
import Report from '../../../models/Report.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { uploadImage, deleteFile } from '../../../config/cloudinary.js';
import { getFileUrl } from '../../../utils/s3.js';
import fs from 'fs';
import { isUserAllowedToViewReels } from '../../../utils/geoHelper.js';

/**
 * @desc    Get user profile by username
 * @route   GET /api/users/:username
 * @access  Public
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username: username.toLowerCase() })
    .select('-otp -deviceTokens');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Sync stats (End-to-end reliability)
  // 1. Re-calculate actual reels count and total likes received on those reels
  const activeReels = await Reel.find({ user: user._id, isActive: true, status: 'completed' });
  const actualReelsCount = activeReels.length;
  const actualLikesCount = activeReels.reduce((sum, r) => sum + (r.stats?.likesCount || 0), 0);

  // 2. Re-calculate actual followers/following counts
  const [actualFollowersCount, actualFollowingCount] = await Promise.all([
    Follow.countDocuments({ following: user._id, status: 'accepted' }),
    Follow.countDocuments({ follower: user._id, status: 'accepted' })
  ]);

  // 3. Update if out of sync
  const statsChanged = 
    user.stats.reelsCount !== actualReelsCount || 
    user.stats.likesCount !== actualLikesCount ||
    user.stats.followersCount !== actualFollowersCount ||
    user.stats.followingCount !== actualFollowingCount;

  if (statsChanged) {
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          'stats.reelsCount': actualReelsCount,
          'stats.likesCount': actualLikesCount,
          'stats.followersCount': actualFollowersCount,
          'stats.followingCount': actualFollowingCount
        } 
      }
    );
    // Update local object for response
    user.stats.reelsCount = actualReelsCount;
    user.stats.likesCount = actualLikesCount;
    user.stats.followersCount = actualFollowersCount;
    user.stats.followingCount = actualFollowingCount;
  }

  // Check if current user is following this user
  let isFollowing = false;
  let followStatus = null;
  let isFollower = false;

  if (req.user) {
    const follow = await Follow.findOne({
      follower: req.user._id,
      following: user._id
    });
    if (follow) {
      isFollowing = follow.status === 'accepted';
      followStatus = follow.status;
    }

    // Check if the other user follows or has requested to follow the current user
    const incomingFollow = await Follow.findOne({
      follower: user._id,
      following: req.user._id
    });
    
    if (incomingFollow) {
      isFollower = incomingFollow.status === 'accepted';
      user.incomingFollowStatus = incomingFollow.status;
    } else {
      user.incomingFollowStatus = null;
    }
  }

  // Get the incoming follow status
  const incomingFollowStatus = user.incomingFollowStatus;

  res.status(200).json({
    success: true,
    user: {
      ...user.toJSON(),
      isFollowing,
      followStatus,
      isFollower,
      incomingFollowStatus
    }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { username, fullName, bio, email, isPrivate, socialLinks, interests, commentPrivacy, mentionPrivacy, messagePrivacy, downloadPrivacy } = req.body;

  const user = req.user;

  // Check if username is being changed and if it's available
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
  if (bio !== undefined) user.bio = bio;
  if (email !== undefined) user.email = email;
  if (isPrivate !== undefined) user.isPrivate = isPrivate;
  if (socialLinks) user.socialLinks = socialLinks;
  if (interests !== undefined) user.interests = interests;
  if (commentPrivacy !== undefined) user.commentPrivacy = commentPrivacy;
  if (mentionPrivacy !== undefined) user.mentionPrivacy = mentionPrivacy;
  if (messagePrivacy !== undefined) user.messagePrivacy = messagePrivacy;
  if (downloadPrivacy !== undefined) user.downloadPrivacy = downloadPrivacy;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user
  });
});

/**
 * @desc    Upload/Update profile picture
 * @route   POST /api/users/profile-picture
 * @access  Private
 */
export const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload an image'
    });
  }

  const user = req.user;

  // Delete old profile picture if exists
  if (user.profilePicture.publicId) {
    await deleteFile(user.profilePicture.publicId, 'image');
  }

  // Upload new image
  const result = await uploadImage(req.file.path, 'jhumroo/profiles');

  // Delete temp file
  fs.unlinkSync(req.file.path);

  // Update user
  user.profilePicture = {
    url: result.url,
    publicId: result.publicId
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile picture updated successfully',
    profilePicture: user.profilePicture
  });
});

/**
 * @desc    Get user's reels
 * @route   GET /api/users/:username/reels
 * @access  Public
 */
export const getUserReels = asyncHandler(async (req, res) => {
  // Global geo-targeting check
  const isAllowed = await isUserAllowedToViewReels(req);
  if (!isAllowed) {
    return res.status(200).json({
      success: true,
      reels: [],
      pagination: {
        total: 0,
        pages: 0,
        page: 1,
        limit
      }
    });
  }

  const { username } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const user = await User.findOne({ username: username.toLowerCase() });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check privacy
  if (user.isPrivate && (!req.user || req.user._id.toString() !== user._id.toString())) {
    let isFollowing = false;
    if (req.user) {
      const follow = await Follow.findOne({ 
        follower: req.user._id, 
        following: user._id,
        status: 'accepted'
      });
      isFollowing = !!follow;
    }
    if (!isFollowing) {
      return res.status(403).json({
        success: false,
        message: 'This account is private',
        isPrivate: true
      });
    }
  }

  let query = { user: user._id, isActive: true, status: 'completed' };

  // Filter based on audience settings for other users
  if (!req.user || req.user._id.toString() !== user._id.toString()) {
    let isFollowing = false;
    let isFollower = false;

    if (req.user) {
      const [follow, incoming] = await Promise.all([
        Follow.findOne({ follower: req.user._id, following: user._id, status: 'accepted' }),
        Follow.findOne({ follower: user._id, following: req.user._id, status: 'accepted' })
      ]);
      isFollowing = !!follow;
      isFollower = !!incoming;
    }

    const allowedAudiences = ['everyone'];
    if (isFollowing) {
      allowedAudiences.push('followers');
    }
    if (isFollower) {
      allowedAudiences.push('following');
    }

    query.audience = { $in: allowedAudiences };
  }

  const reels = await Reel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified downloadPrivacy');

  const total = await Reel.countDocuments(query);

  res.status(200).json({
    success: true,
    reels,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get user's liked reels
 * @route   GET /api/users/liked-reels
 * @access  Private
 */
export const getLikedReels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const likes = await Like.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'reel',
      populate: {
        path: 'user',
        select: 'username fullName profilePicture isVerified downloadPrivacy'
      }
    });

  const reels = likes.map(like => like.reel).filter(reel => reel && reel.isActive && reel.status === 'completed');
  const total = await Like.countDocuments({ user: req.user._id });

  res.status(200).json({
    success: true,
    reels,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get user's saved reels
 * @route   GET /api/users/saved-reels
 * @access  Private
 */
export const getSavedReels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const collection = req.query.collection;

  const query = { user: req.user._id };
  if (collection) {
    query.collection = collection;
  }

  const savedReels = await SavedReel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'reel',
      populate: {
        path: 'user',
        select: 'username fullName profilePicture isVerified downloadPrivacy'
      }
    });

  const reels = savedReels.map(saved => saved.reel).filter(reel => reel && reel.isActive && reel.status === 'completed');
  const total = await SavedReel.countDocuments(query);

  res.status(200).json({
    success: true,
    reels,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Search users
 * @route   GET /api/users/search
 * @access  Public
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  if (!q || q.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  const queryObj = {
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { fullName: { $regex: q, $options: 'i' } }
    ],
    isActive: true
  };

  if (req.user) {
    queryObj._id = { $ne: req.user._id };
  }

  const users = await User.find(queryObj)
    .select('username fullName profilePicture isVerified stats')
    .sort({ 'stats.followersCount': -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(queryObj);

  // Add isFollowing status
  const userList = await Promise.all(users.map(async (u) => {
    const userObj = u.toJSON();
    if (req.user) {
      const follow = await Follow.findOne({
        follower: req.user._id,
        following: u._id
      });
      userObj.isFollowing = !!follow && follow.status === 'accepted';
      userObj.followStatus = follow?.status || null;
    } else {
      userObj.isFollowing = false;
      userObj.followStatus = null;
    }
    return userObj;
  }));

  res.status(200).json({
    success: true,
    users: userList,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get suggested users
 * @route   GET /api/users/suggested
 * @access  Private
 */
export const getSuggestedUsers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  let excludeIds = [];
  
  if (req.user) {
    const following = await Follow.find({ follower: req.user._id }).select('following');
    const followingIds = following.map(f => f.following);
    excludeIds = [...followingIds, req.user._id];
  }

  const query = { isActive: true };
  if (excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }

  const users = await User.find(query)
    .select('username fullName profilePicture isVerified stats')
    .sort({ 'stats.followersCount': -1 })
    .limit(limit);

  // Add isFollowing status
  const userList = await Promise.all(users.map(async (u) => {
    const userObj = u.toJSON();
    if (req.user) {
      const follow = await Follow.findOne({
        follower: req.user._id,
        following: u._id
      });
      userObj.isFollowing = !!follow && follow.status === 'accepted';
      userObj.followStatus = follow?.status || null;
    } else {
      userObj.isFollowing = false;
      userObj.followStatus = null;
    }
    return userObj;
  }));

  res.status(200).json({
    success: true,
    users: userList
  });
});

/**
 * @desc    Update FCM tokens for push notifications
 * @route   POST /api/users/fcm-token
 * @access  Private
 */
export const updateFCMToken = asyncHandler(async (req, res) => {
  const { fcmTokenMobile, fcmToken, token, platform } = req.body;

  if (fcmTokenMobile) req.user.fcmTokenMobile = fcmTokenMobile;
  if (fcmToken) req.user.fcmToken = fcmToken;

  if (token) {
    if (platform === 'app' || platform === 'mobile') {
      req.user.fcmTokenMobile = token;
    } else {
      req.user.fcmToken = token;
    }
  }

  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'FCM token updated successfully'
  });
});

/**
 * @desc    Get users for mention suggestions
 * @route   GET /api/users/mentions/suggestions
 * @access  Private
 */
export const getMentionSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user._id;

  if (!q) {
    return res.status(200).json({ success: true, users: [] });
  }

  // 1. Find users matching the query
  const queryObj = {
    username: { $regex: q.startsWith('@') ? q.slice(1) : q, $options: 'i' },
    isActive: true,
    _id: { $ne: currentUserId }
  };

  const users = await User.find(queryObj)
    .select('username fullName profilePicture isVerified mentionPrivacy')
    .limit(10)
    .lean();

  const suggestions = [];

  for (const targetUser of users) {
    const privacy = targetUser.mentionPrivacy || 'everyone';

    if (privacy === 'everyone') {
      suggestions.push(targetUser);
    } else if (privacy === 'friends') {
      // Check mutual follow
      const [followA, followB] = await Promise.all([
        Follow.findOne({ follower: currentUserId, following: targetUser._id, status: 'accepted' }),
        Follow.findOne({ follower: targetUser._id, following: currentUserId, status: 'accepted' })
      ]);
      if (followA && followB) {
        suggestions.push(targetUser);
      }
    }
    // If 'no_one', don't add
  }

  res.status(200).json({
    success: true,
    users: suggestions
  });
});

/**
 * @desc    Block/Unblock a user
 * @route   POST /api/users/:id/block
 * @access  Private
 */
export const toggleBlockUser = asyncHandler(async (req, res) => {
  const { id: targetUserId } = req.params;
  const user = req.user;

  if (targetUserId === user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot block yourself'
    });
  }

  const isBlocked = user.blockedUsers.includes(targetUserId);

  if (isBlocked) {
    // Unblock
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetUserId);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      isBlocked: false
    });
  } else {
    // Block
    user.blockedUsers.push(targetUserId);
    await user.save();

    // Remove follow relationship if exists
    await Follow.deleteMany({
      $or: [
        { follower: user._id, following: targetUserId },
        { follower: targetUserId, following: user._id }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      isBlocked: true
    });
  }
});

/**
 * @desc    Report a user
 * @route   POST /api/users/:id/report
 * @access  Private
 */
export const reportUser = asyncHandler(async (req, res) => {
  const { reason, description } = req.body;
  const { id: targetUserId } = req.params;

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Limit: 10 reports per day (includes all report types to prevent spam)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reportsInLast24Hours = await Report.countDocuments({
    reportedBy: req.user._id,
    createdAt: { $gte: oneDayAgo }
  });

  if (reportsInLast24Hours >= 10) {
    return res.status(429).json({
      success: false,
      message: 'You have exceeded the daily report limit (10 per day). Please try again later.'
    });
  }

  await Report.create({
    reportedBy: req.user._id,
    reportType: 'User',
    reportedItem: targetUserId,
    reason,
    description
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for reporting. We will review it shortly.'
  });
});

/**
 * @desc    Delete user account and all associated data
 * @route   DELETE /api/users/profile
 * @access  Private
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Delete user profile picture from Cloudinary if exists
  if (req.user.profilePicture && req.user.profilePicture.publicId) {
    try {
      await deleteFile(req.user.profilePicture.publicId, 'image');
    } catch (err) {
      console.error('Account Delete: Cloudinary user picture delete failed:', err.message);
    }
  }

  // 2. Find and delete all user's reels (including Cloudinary video, likes, saves and comments on each reel)
  const userReels = await Reel.find({ user: userId });
  for (const reel of userReels) {
    if (reel.video && reel.video.publicId) {
      try {
        await deleteFile(reel.video.publicId, 'video');
      } catch (err) {
        console.error(`Account Delete: Cloudinary video delete failed for reel ${reel._id}:`, err.message);
      }
    }
    // Delete likes, saves, and comments for this reel
    await Like.deleteMany({ reel: reel._id });
    await SavedReel.deleteMany({ reel: reel._id });
    const Comment = (await import('../../../models/Comment.model.js')).default;
    await Comment.deleteMany({ reel: reel._id });
    await reel.deleteOne();
  }

  // 3. Delete user's comments on other reels
  const Comment = (await import('../../../models/Comment.model.js')).default;
  await Comment.deleteMany({ user: userId });

  // 4. Delete user's likes and saves
  await Like.deleteMany({ user: userId });
  await SavedReel.deleteMany({ user: userId });

  // 5. Delete all follows (both follower and following)
  await Follow.deleteMany({
    $or: [{ follower: userId }, { following: userId }]
  });

  // 6. Delete notifications (sent or received)
  const Notification = (await import('../../../models/Notification.model.js')).default;
  await Notification.deleteMany({
    $or: [{ recipient: userId }, { sender: userId }]
  });

  // 7. Delete user preference
  const UserPreference = (await import('../../../models/UserPreference.model.js')).default;
  await UserPreference.deleteMany({ user: userId });

  // 8. Delete user reports
  await Report.deleteMany({
    $or: [{ reportedBy: userId }, { reportedItem: userId }]
  });

  // 9. Clean conversations and messages
  const Conversation = (await import('../../../models/Conversation.model.js')).default;
  const Message = (await import('../../../models/Message.model.js')).default;
  await Message.deleteMany({ sender: userId });
  await Conversation.deleteMany({ participants: userId });

  // 10. Finally, delete the User record itself
  await req.user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Your account and all associated data have been permanently deleted.'
  });
});


