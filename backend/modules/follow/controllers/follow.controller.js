import Follow from '../../../models/Follow.model.js';
import User from '../../../models/User.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Follow a user
 * @route   POST /api/follows/:userId
 * @access  Private
 */
export const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if trying to follow self
  if (userId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot follow yourself'
    });
  }

  // Check if user exists
  const userToFollow = await User.findById(userId);
  if (!userToFollow) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if already following
  const existingFollow = await Follow.findOne({
    follower: req.user._id,
    following: userId
  });

  if (existingFollow) {
    return res.status(400).json({
      success: false,
      message: 'Already following this user'
    });
  }

  // Create follow relationship
  const follow = await Follow.create({
    follower: req.user._id,
    following: userId,
    status: userToFollow.isPrivate ? 'pending' : 'accepted'
  });

  res.status(201).json({
    success: true,
    message: userToFollow.isPrivate ? 'Follow request sent' : 'User followed successfully',
    status: follow.status
  });
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/follows/:userId
 * @access  Private
 */
export const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const follow = await Follow.findOneAndDelete({
    follower: req.user._id,
    following: userId
  });

  if (!follow) {
    return res.status(404).json({
      success: false,
      message: 'Not following this user'
    });
  }

  res.status(200).json({
    success: true,
    message: 'User unfollowed successfully'
  });
});

/**
 * @desc    Get user's followers
 * @route   GET /api/follows/:userId/followers
 * @access  Public
 */
export const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get followers
  const follows = await Follow.find({ 
    following: userId,
    status: 'accepted'
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('follower', 'username fullName profilePicture isVerified stats');

  const followers = await Promise.all(follows.map(async follow => {
    const follower = follow.follower.toJSON();
    // Check if current user is following this follower
    if (req.user) {
      const followStatus = await Follow.findOne({
        follower: req.user._id,
        following: follower._id
      });
      follower.isFollowing = !!followStatus && followStatus.status === 'accepted';
    }
    return follower;
  }));

  const total = await Follow.countDocuments({ following: userId, status: 'accepted' });

  res.status(200).json({
    success: true,
    followers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get user's following
 * @route   GET /api/follows/:userId/following
 * @access  Public
 */
export const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get following
  const follows = await Follow.find({ 
    follower: userId,
    status: 'accepted'
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('following', 'username fullName profilePicture isVerified stats');

  const following = await Promise.all(follows.map(async follow => {
    const user = follow.following.toJSON();
    // Check if current user is following this user
    if (req.user) {
      const followStatus = await Follow.findOne({
        follower: req.user._id,
        following: user._id
      });
      user.isFollowing = !!followStatus && followStatus.status === 'accepted';
    }
    return user;
  }));

  const total = await Follow.countDocuments({ follower: userId, status: 'accepted' });

  res.status(200).json({
    success: true,
    following,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Remove a follower
 * @route   DELETE /api/follows/followers/:userId
 * @access  Private
 */
export const removeFollower = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const follow = await Follow.findOneAndDelete({
    follower: userId,
    following: req.user._id
  });

  if (!follow) {
    return res.status(404).json({
      success: false,
      message: 'This user is not following you'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Follower removed successfully'
  });
});

/**
 * @desc    Get follow requests (for private accounts)
 * @route   GET /api/follows/requests
 * @access  Private
 */
export const getFollowRequests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const follows = await Follow.find({ 
    following: req.user._id,
    status: 'pending'
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('follower', 'username fullName profilePicture isVerified stats');

  const requests = follows.map(follow => follow.follower);
  const total = await Follow.countDocuments({ following: req.user._id, status: 'pending' });

  res.status(200).json({
    success: true,
    requests,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Accept follow request
 * @route   PUT /api/follows/requests/:userId/accept
 * @access  Private
 */
export const acceptFollowRequest = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const follow = await Follow.findOne({
    follower: userId,
    following: req.user._id,
    status: 'pending'
  });

  if (!follow) {
    return res.status(404).json({
      success: false,
      message: 'Follow request not found'
    });
  }

  follow.status = 'accepted';
  await follow.save();

  res.status(200).json({
    success: true,
    message: 'Follow request accepted'
  });
});

/**
 * @desc    Reject follow request
 * @route   DELETE /api/follows/requests/:userId
 * @access  Private
 */
export const rejectFollowRequest = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const follow = await Follow.findOneAndDelete({
    follower: userId,
    following: req.user._id,
    status: 'pending'
  });

  if (!follow) {
    return res.status(404).json({
      success: false,
      message: 'Follow request not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Follow request rejected'
  });
});

/**
 * @desc    Check if user is following another user
 * @route   GET /api/follows/check/:userId
 * @access  Private
 */
export const checkFollowStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const follow = await Follow.findOne({
    follower: req.user._id,
    following: userId
  });

  res.status(200).json({
    success: true,
    isFollowing: !!follow,
    status: follow?.status || null
  });
});
