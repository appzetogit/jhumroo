import User from '../../../models/User.model.js';
import Reel from '../../../models/Reel.model.js';
import Follow from '../../../models/Follow.model.js';
import Like from '../../../models/Like.model.js';
import SavedReel from '../../../models/SavedReel.model.js';
import Report from '../../../models/Report.model.js';
import WatchAnalytics from '../../../models/WatchAnalytics.model.js';
import { createAdminAlert } from '../../../utils/adminAlertService.js';
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

  if (!user || !user.isActive) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if target user has blocked current user
  let isBlockedByThem = false;
  if (req.user && user.blockedUsers && user.blockedUsers.some(id => id.toString() === req.user._id.toString())) {
    isBlockedByThem = true;
  }

  if (isBlockedByThem) {
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: 'jhumroo_user',
        fullName: 'Jhumroo User',
        profilePicture: {
          url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jhumroo_user'
        },
        bio: 'This profile is unavailable.',
        isPrivate: true,
        stats: {
          reelsCount: 0,
          likesCount: 0,
          followersCount: 0,
          followingCount: 0
        },
        isBlockedByThem: true,
        isFollowing: false,
        followStatus: null,
        isFollower: false,
        incomingFollowStatus: null
      }
    });
  }

  // Sync stats (End-to-end reliability)
  // 1. Re-calculate actual stats in parallel on MongoDB server-side using counts/aggregations
  const [
    actualReelsCount,
    likesAggregation,
    actualFollowersCount,
    actualFollowingCount
  ] = await Promise.all([
    Reel.countDocuments({ user: user._id, isActive: true, status: 'completed' }),
    Reel.aggregate([
      { $match: { user: user._id, isActive: true, status: 'completed' } },
      { $group: { _id: null, totalLikes: { $sum: '$stats.likesCount' } } }
    ]),
    Follow.countDocuments({ following: user._id, status: 'accepted' }),
    Follow.countDocuments({ follower: user._id, status: 'accepted' })
  ]);

  const actualLikesCount = likesAggregation[0]?.totalLikes || 0;

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

  // Check follow relationships in parallel if logged in
  let isFollowing = false;
  let followStatus = null;
  let isFollower = false;

  if (req.user) {
    const [follow, incomingFollow] = await Promise.all([
      Follow.findOne({ follower: req.user._id, following: user._id }),
      Follow.findOne({ follower: user._id, following: req.user._id })
    ]);

    if (follow) {
      isFollowing = follow.status === 'accepted';
      followStatus = follow.status;
    }

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
  const { username, fullName, bio, email, isPrivate, socialLinks, interests, commentPrivacy, mentionPrivacy, messagePrivacy, downloadPrivacy, activeStatusPrivacy, notificationSettings } = req.body;

  const user = req.user;

  // Validate Full Name format
  if (fullName !== undefined) {
    const cleanFullName = fullName.trim();
    const nameRegex = /^[a-zA-Z.\-']{2,}(?:\s+[a-zA-Z.\-']+)*$/;
    if (!cleanFullName || !nameRegex.test(cleanFullName)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid full name (letters and spaces only, min 2 characters)'
      });
    }
  }

  // Validate Email format
  if (email !== undefined && email !== '') {
    const cleanEmail = email.trim();
    if (cleanEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|co|in|net|org|edu|gov|mil|info|biz)$/i;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address (e.g. name@domain.com)'
        });
      }
      const domain = cleanEmail.split('@')[1].toLowerCase();
      const typos = {
        'gamil.com': 'gmail.com',
        'gamil.co': 'gmail.com',
        'yaho.com': 'yahoo.com',
        'hotmal.com': 'hotmail.com'
      };
      if (typos[domain]) {
        return res.status(400).json({
          success: false,
          message: `Did you mean ${typos[domain]}?`
        });
      }
    }
  }

  // Check if username is being changed and if it's available
  if (username && username !== user.username) {
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }
    if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain lowercase letters, numbers, dots, and underscores'
      });
    }
    if (!/[0-9._]/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must contain at least one number or special character (e.g. . or _)'
      });
    }
    const existingUser = await User.findOne({ 
      username: cleanUsername,
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }
    user.username = cleanUsername;
  }

  // Update fields
  if (fullName !== undefined) user.fullName = fullName.trim();
  if (bio !== undefined) user.bio = bio;
  if (email !== undefined) user.email = email ? email.trim() : '';
  if (isPrivate !== undefined) user.isPrivate = isPrivate;
  if (socialLinks) user.socialLinks = socialLinks;
  if (interests !== undefined) user.interests = interests;
  if (commentPrivacy !== undefined) user.commentPrivacy = commentPrivacy;
  if (mentionPrivacy !== undefined) user.mentionPrivacy = mentionPrivacy;
  if (messagePrivacy !== undefined) user.messagePrivacy = messagePrivacy;
  if (downloadPrivacy !== undefined) user.downloadPrivacy = downloadPrivacy;
  if (activeStatusPrivacy !== undefined) user.activeStatusPrivacy = activeStatusPrivacy;
  if (notificationSettings !== undefined) {
    user.notificationSettings = {
      ...user.notificationSettings,
      ...notificationSettings
    };
  }

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

  // Load follow status once if logged in and looking at someone else's profile
  let isFollowing = false;
  let isFollower = false;
  if (req.user && req.user._id.toString() !== user._id.toString()) {
    const isTargetBlockedByMe = req.user.blockedUsers && req.user.blockedUsers.some(id => id.toString() === user._id.toString());
    const isMeBlockedByTarget = user.blockedUsers && user.blockedUsers.some(id => id.toString() === req.user._id.toString());
    if (isTargetBlockedByMe || isMeBlockedByTarget) {
      return res.status(200).json({
        success: true,
        reels: [],
        pagination: { total: 0, pages: 0, page: 1, limit }
      });
    }

    const [follow, incoming] = await Promise.all([
      Follow.findOne({ follower: req.user._id, following: user._id, status: 'accepted' }),
      Follow.findOne({ follower: user._id, following: req.user._id, status: 'accepted' })
    ]);
    isFollowing = !!follow;
    isFollower = !!incoming;
  }

  // Check privacy
  if (user.isPrivate && (!req.user || req.user._id.toString() !== user._id.toString())) {
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
    const allowedAudiences = ['everyone'];
    if (isFollowing) {
      allowedAudiences.push('followers');
    }
    if (isFollower) {
      allowedAudiences.push('following');
    }

    query.audience = { $in: allowedAudiences };
  }

  if (req.user) {
    const reportedReels = await Report.find({
      reportedBy: req.user._id,
      reportType: 'Reel'
    }).select('reportedItem');
    const reportedReelIds = reportedReels.map(r => r.reportedItem);
    if (reportedReelIds.length > 0) {
      query._id = { $nin: reportedReelIds };
    }
  }

  const reels = await Reel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified downloadPrivacy')
    .populate('music.audioId')
    .populate({ path: 'originalReel', populate: { path: 'user', select: 'username fullName profilePicture isVerified' } });

  const total = await Reel.countDocuments(query);

  let reelsObj = reels.map(r => r.toObject ? r.toObject({ virtuals: true }) : { ...r });

  if (req.user && reelsObj.length > 0) {
    const reelIds = reelsObj.map(r => r._id);
    const [likes, saves] = await Promise.all([
      Like.find({ user: req.user._id, reel: { $in: reelIds } }),
      SavedReel.find({ user: req.user._id, reel: { $in: reelIds } })
    ]);
    const likedSet = new Set(likes.map(l => l.reel.toString()));
    const savedSet = new Set(saves.map(s => s.reel.toString()));
    reelsObj.forEach(r => {
      r.isLiked = likedSet.has(r._id.toString());
      r.isSaved = savedSet.has(r._id.toString());
    });
  }

  res.status(200).json({
    success: true,
    reels: reelsObj,
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
      populate: [
        {
          path: 'user',
          select: 'username fullName profilePicture isVerified downloadPrivacy'
        },
        {
          path: 'music.audioId'
        },
        {
          path: 'originalReel',
          populate: {
            path: 'user',
            select: 'username fullName profilePicture isVerified'
          }
        }
      ]
    });

  const reels = likes
    .map(like => {
      const reel = like.reel;
      if (!reel) return null;
      // Convert Mongoose document to plain object so custom flags are included in JSON
      const reelObj = reel.toObject ? reel.toObject({ virtuals: true }) : { ...reel };
      // Mark isLiked = true since all reels from this endpoint are liked by the user
      reelObj.isLiked = true;
      return reelObj;
    })
    .filter(reel => reel && reel.isActive && reel.status === 'completed');

  if (req.user && reels.length > 0) {
    const reelIds = reels.map(r => r._id);
    const saves = await SavedReel.find({ user: req.user._id, reel: { $in: reelIds } });
    const savedSet = new Set(saves.map(s => s.reel.toString()));
    reels.forEach(r => {
      r.isSaved = savedSet.has(r._id.toString());
    });
  }

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

  const reportedReels = await Report.find({
    reportedBy: req.user._id,
    reportType: 'Reel'
  }).select('reportedItem');
  const reportedReelIds = reportedReels.map(r => r.reportedItem);

  const query = { user: req.user._id };
  if (collection) {
    query.collection = collection;
  }
  if (reportedReelIds.length > 0) {
    query.reel = { $nin: reportedReelIds };
  }

  const savedReels = await SavedReel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'reel',
      populate: [
        {
          path: 'user',
          select: 'username fullName profilePicture isVerified downloadPrivacy'
        },
        {
          path: 'music.audioId'
        },
        {
          path: 'originalReel',
          populate: {
            path: 'user',
            select: 'username fullName profilePicture isVerified'
          }
        }
      ]
    });

  const reels = savedReels
    .map(saved => {
      const reel = saved.reel;
      if (!reel) return null;
      // Convert Mongoose document to plain object so custom flags are included in JSON
      const reelObj = reel.toObject ? reel.toObject({ virtuals: true }) : { ...reel };
      // Mark isSaved = true since all reels from this endpoint are saved by the user
      reelObj.isSaved = true;
      return reelObj;
    })
    .filter(reel => reel && reel.isActive && reel.status === 'completed');

  if (req.user && reels.length > 0) {
    const reelIds = reels.map(r => r._id);
    const likes = await Like.find({ user: req.user._id, reel: { $in: reelIds } });
    const likedSet = new Set(likes.map(l => l.reel.toString()));
    reels.forEach(r => {
      r.isLiked = likedSet.has(r._id.toString());
    });
  }

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

  // Handle explicit clear (empty string) — wipe both token fields
  if (fcmToken === '') {
    req.user.fcmToken = '';
    req.user.fcmTokenMobile = '';
  } else if (fcmTokenMobile === '') {
    req.user.fcmToken = '';
    req.user.fcmTokenMobile = '';
  } else if (fcmToken) {
    // Registering a web/PWA token:
    // Store in fcmToken and clear fcmTokenMobile if it holds a DIFFERENT token
    // (same device — prevents dual push to the same device from two token fields)
    if (req.user.fcmTokenMobile && req.user.fcmTokenMobile !== fcmToken) {
      console.log(`[FCM] Clearing stale fcmTokenMobile — new web token registered for user ${req.user._id}`);
      req.user.fcmTokenMobile = '';
    }
    req.user.fcmToken = fcmToken;
  } else if (fcmTokenMobile) {
    // Registering a native mobile token:
    // Store in fcmTokenMobile and clear fcmToken if it holds a DIFFERENT token
    if (req.user.fcmToken && req.user.fcmToken !== fcmTokenMobile) {
      console.log(`[FCM] Clearing stale fcmToken — new mobile token registered for user ${req.user._id}`);
      req.user.fcmToken = '';
    }
    req.user.fcmTokenMobile = fcmTokenMobile;
  } else if (token) {
    // Legacy: generic token field with optional platform hint
    if (platform === 'app' || platform === 'mobile') {
      if (req.user.fcmToken && req.user.fcmToken !== token) {
        req.user.fcmToken = '';
      }
      req.user.fcmTokenMobile = token;
    } else {
      if (req.user.fcmTokenMobile && req.user.fcmTokenMobile !== token) {
        req.user.fcmTokenMobile = '';
      }
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

  const report = await Report.create({
    reportedBy: req.user._id,
    reportType: 'User',
    reportedItem: targetUserId,
    reason,
    description
  });

  createAdminAlert({
    type: 'new_report',
    title: 'New Account Report',
    message: `@${req.user.username} reported user account: "${reason || 'no reason'}"`,
    link: '/admin/reports'
  }).catch(err => console.error('[reportUser] admin alert failed:', err));

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

  // 10. Instead of hard deleting, soft delete the user by setting isActive to false
  req.user.isActive = false;
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Your account and all associated data have been permanently deleted.'
  });
});

/**
 * @desc    Block/Unblock a user from commenting
 * @route   POST /api/users/:id/block-commenter
 * @access  Private
 */
export const toggleBlockCommenter = asyncHandler(async (req, res) => {
  const { id: targetUserId } = req.params;
  const user = req.user;

  if (targetUserId === user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot block yourself from commenting'
    });
  }

  // Ensure blockedCommenters array exists
  if (!user.blockedCommenters) {
    user.blockedCommenters = [];
  }

  const isBlocked = user.blockedCommenters.includes(targetUserId);

  if (isBlocked) {
    // Unblock commenter
    user.blockedCommenters = user.blockedCommenters.filter(id => id.toString() !== targetUserId);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User unblocked from commenting successfully',
      isBlocked: false,
      user
    });
  } else {
    // Block commenter
    user.blockedCommenters.push(targetUserId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User blocked from commenting successfully',
      isBlocked: true,
      user
    });
  }
});

/**
 * @desc    Get all comment-blocked users
 * @route   GET /api/users/me/blocked-commenters
 * @access  Private
 */
export const getBlockedCommenters = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedCommenters', 'username fullName profilePicture');

  res.status(200).json({
    success: true,
    users: user.blockedCommenters || []
  });
});

/**
 * @desc    Get all blocked users
 * @route   GET /api/users/me/blocked
 * @access  Private
 */
export const getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedUsers', 'username fullName profilePicture');

  res.status(200).json({
    success: true,
    users: user.blockedUsers || []
  });
});

/**
 * @desc    Get real screen time analytics for logged in user
 * @route   GET /api/users/me/screen-time
 * @access  Private
 */
export const getScreenTimeAnalytics = asyncHandler(async (req, res) => {
  const offsetWeeks = parseInt(req.query.offsetWeeks) || 0;
  const now = new Date();
  now.setDate(now.getDate() - offsetWeeks * 7);

  const dayOfWeek = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Fetch genuine watch analytics records from DB for this user
  const records = await WatchAnalytics.find({
    user: req.user._id,
    createdAt: { $gte: start, $lte: end }
  }).select('watchDuration createdAt');

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayKey = new Date().toISOString().split('T')[0];

  const days = [];
  let totalWeekSeconds = 0;

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().split('T')[0];
    const isToday = key === todayKey;

    const dayStart = new Date(current);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const dayRecords = records.filter(r => {
      const d = new Date(r.createdAt);
      return d >= dayStart && d <= dayEnd;
    });

    let daySeconds = 0;
    let nightSeconds = 0;

    dayRecords.forEach(r => {
      const h = new Date(r.createdAt).getHours();
      const isNight = h >= 22 || h < 6;
      const dur = Math.max(r.watchDuration || 0, 0);
      if (isNight) {
        nightSeconds += dur;
      } else {
        daySeconds += dur;
      }
    });

    const dayMins = Math.round(daySeconds / 60);
    const nightMins = Math.round(nightSeconds / 60);
    const totalMins = dayMins + nightMins;
    totalWeekSeconds += (daySeconds + nightSeconds);

    days.push({
      dateKey: key,
      date: current,
      dayName: daysOfWeek[current.getDay()],
      label: isToday ? 'Today' : daysOfWeek[current.getDay()],
      isToday,
      dayMinutes: dayMins,
      nightMinutes: nightMins,
      totalMinutes: totalMins,
      daySeconds,
      nightSeconds,
      totalSeconds: daySeconds + nightSeconds
    });
  }

  // Previous week comparison
  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - 7);
  const prevEnd = new Date(end);
  prevEnd.setDate(end.getDate() - 7);

  const prevRecords = await WatchAnalytics.find({
    user: req.user._id,
    createdAt: { $gte: prevStart, $lte: prevEnd }
  }).select('watchDuration');

  const prevTotalSeconds = prevRecords.reduce((acc, r) => acc + (r.watchDuration || 0), 0);
  const totalWeekMinutes = Math.round(totalWeekSeconds / 60);
  const prevTotalMinutes = Math.round(prevTotalSeconds / 60);
  const dailyAverage = Math.round(totalWeekMinutes / 7);

  let percentDiff = 0;
  if (prevTotalMinutes > 0) {
    percentDiff = Math.round(((totalWeekMinutes - prevTotalMinutes) / prevTotalMinutes) * 100);
  } else if (totalWeekMinutes > 0) {
    percentDiff = 100;
  }

  const options = { month: 'short', day: 'numeric' };
  const weekLabel = `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;

  res.status(200).json({
    success: true,
    stats: {
      weekLabel,
      startDate: start,
      endDate: end,
      days,
      totalWeekMinutes,
      totalWeekSeconds,
      dailyAverage,
      percentDiff,
      maxMinutesInDay: Math.max(...days.map(d => d.totalMinutes), 1)
    }
  });
});

/**
 * @desc    Record active session screen time heartbeat
 * @route   POST /api/users/me/screen-time/heartbeat
 * @access  Private
 */
export const recordScreenTimeHeartbeat = asyncHandler(async (req, res) => {
  const { seconds = 30 } = req.body;
  
  // Find a generic active reel or create lightweight user watch session
  const latestReel = await Reel.findOne({ isArchived: { $ne: true } }).select('_id');
  if (latestReel) {
    await WatchAnalytics.create({
      user: req.user._id,
      reel: latestReel._id,
      watchDuration: Math.max(parseFloat(seconds) || 30, 1),
      completionPercentage: 100,
      swipeTiming: parseFloat(seconds) || 30
    });
  }

  res.status(200).json({
    success: true,
    message: 'Screen time heartbeat recorded'
  });
});

/**
 * @desc    Get user watch history (deduplicated by reel, ordered by most recently watched)
 * @route   GET /api/users/me/watch-history
 * @access  Private
 */
export const getWatchHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  // Aggregate user's watched reels grouped by unique reel ID to get the latest watchedAt
  const historyAgg = await WatchAnalytics.aggregate([
    { $match: { user: req.user._id } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$reel',
        latestWatchedAt: { $first: '$createdAt' },
        totalWatchDuration: { $sum: '$watchDuration' },
        lastWatchDuration: { $first: '$watchDuration' },
        isFullWatch: { $first: '$isFullWatch' },
      }
    },
    { $sort: { latestWatchedAt: -1 } },
    {
      $lookup: {
        from: 'reels',
        localField: '_id',
        foreignField: '_id',
        as: 'reel'
      }
    },
    { $unwind: '$reel' },
    // Filter active and existing reels only
    {
      $match: {
        'reel.isActive': { $ne: false },
        'reel.isArchived': { $ne: true }
      }
    },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'reel.user',
        foreignField: '_id',
        as: 'reelUser'
      }
    },
    {
      $unwind: {
        path: '$reelUser',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: '$reel._id',
        reelId: '$reel._id',
        watchedAt: '$latestWatchedAt',
        totalWatchDuration: '$totalWatchDuration',
        lastWatchDuration: '$lastWatchDuration',
        isFullWatch: '$isFullWatch',
        caption: '$reel.caption',
        video: '$reel.video',
        stats: '$reel.stats',
        isActive: '$reel.isActive',
        isPhoto: '$reel.isPhoto',
        type: '$reel.type',
        createdAt: '$reel.createdAt',
        user: {
          _id: '$reelUser._id',
          username: '$reelUser.username',
          fullName: '$reelUser.fullName',
          profilePicture: '$reelUser.profilePicture',
          isVerified: '$reelUser.isVerified'
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    history: historyAgg,
    page,
    hasMore: historyAgg.length === limit
  });
});

/**
 * @desc    Remove single reel from watch history
 * @route   DELETE /api/users/me/watch-history/:reelId
 * @access  Private
 */
export const removeWatchHistoryItem = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  await WatchAnalytics.deleteMany({
    user: req.user._id,
    reel: reelId
  });

  res.status(200).json({
    success: true,
    message: 'Reel removed from watch history'
  });
});

/**
 * @desc    Clear entire watch history for user
 * @route   DELETE /api/users/me/watch-history
 * @access  Private
 */
export const clearWatchHistory = asyncHandler(async (req, res) => {
  await WatchAnalytics.deleteMany({
    user: req.user._id
  });

  res.status(200).json({
    success: true,
    message: 'Watch history cleared'
  });
});




