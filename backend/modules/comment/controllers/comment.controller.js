import mongoose from 'mongoose';
import Comment from '../../../models/Comment.model.js';
import Reel from '../../../models/Reel.model.js';
import Ad from '../../../models/Ad.model.js';
import User from '../../../models/User.model.js';
import Follow from '../../../models/Follow.model.js';
import Like from '../../../models/Like.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { createNotification } from '../../../utils/notificationService.js';
import { getIO } from '../../../config/socket.js';

/**
 * Helper function to populate comment with user details and follow status
 */
const populateCommentWithUserDetails = async (comments, currentUserId) => {
  if (!comments || comments.length === 0) return [];
  
  if (!Array.isArray(comments)) {
    comments = [comments];
  }

  // Get all unique user IDs from comments
  const userIds = comments
    .map(c => (c.user?._id || c.user))
    .filter(id => id !== undefined && id !== null);

  // Check if current user follows these users
  let followStatuses = {};
  if (currentUserId && userIds.length > 0) {
    const follows = await Follow.find({
      follower: currentUserId,
      following: { $in: userIds },
      status: 'accepted'
    }).select('following');
    
    followStatuses = follows.reduce((acc, follow) => {
      acc[follow.following.toString()] = true;
      return acc;
    }, {});
  }

  // Check if current user liked these comments
  const commentIds = comments.map(c => c._id || c.id).filter(id => id);
  let likeStatuses = {};

  if (commentIds.length > 0) {
    const commentObjectIds = commentIds.map(id => new mongoose.Types.ObjectId(id));

    // likesCount is kept exact by $inc in toggleCommentLike; only fetch the viewer's like status.
    if (currentUserId) {
      const userObjectId = new mongoose.Types.ObjectId(currentUserId);
      const likes = await Like.find({
        user: userObjectId,
        comment: { $in: commentObjectIds }
      }).lean();
      
      likeStatuses = likes.reduce((acc, like) => {
        if (like.comment) {
          acc[like.comment.toString()] = true;
        }
        return acc;
      }, {});
    }
  }

  // Add follow and like status to each comment
  return comments.map((comment) => {
    const commentObj = comment.toObject ? comment.toObject() : comment;
    const commentIdStr = (commentObj._id || commentObj.id)?.toString();
    const userId = commentObj.user?._id || commentObj.user;
    const isLiked = commentIdStr ? !!likeStatuses[commentIdStr] : false;

    return {
      ...commentObj,
      likesCount: Math.max(0, commentObj.likesCount || 0),
      isFollowing: userId ? (followStatuses[userId.toString()] || false) : false,
      isOwnComment: (currentUserId && userId) ? userId.toString() === currentUserId.toString() : false,
      isLiked
    };
  });
};

/**
 * @desc    Create a new comment on a reel
 * @route   POST /api/reels/:reelId/comments
 * @access  Private
 */
export const createComment = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const { text, parentCommentId } = req.body;

  // Validate comment text
  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
    });
  }

  // Check if content exists
  let content = await Reel.findById(reelId).populate('user', 'commentPrivacy blockedCommenters');
  let isAd = false;
  
  if (!content) {
    content = await Ad.findById(reelId).populate('user', 'commentPrivacy blockedCommenters');
    isAd = true;
  }

  if (!content) {
    return res.status(404).json({
      success: false,
      message: 'Content not found'
    });
  }

  // Check if comments are allowed (only for reels, ads allow by default for now)
  if (!isAd && !content.allowComments) {
    return res.status(403).json({
      success: false,
      message: 'Comments are not allowed on this reel'
    });
  }

  // Check comment privacy settings (only for reels/user ads)
  const contentOwner = content.user;

  // Check if user is blocked from commenting by the content owner
  if (contentOwner && contentOwner.blockedCommenters && contentOwner.blockedCommenters.some(id => id.toString() === req.user._id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'You are blocked from commenting on this post'
    });
  }
  
  if (!isAd && contentOwner && await User.isBlockedBetween(req.user._id, contentOwner._id)) {
    return res.status(403).json({ success: false, message: 'You cannot comment on this post' });
  }

  if (!isAd && contentOwner && contentOwner._id.toString() !== req.user._id.toString()) {
    const privacy = contentOwner.commentPrivacy || 'everyone';
    if (privacy === 'no_one') {
      return res.status(403).json({ success: false, message: 'Comments are turned off' });
    }
    if (privacy === 'friends') {
      const [followA, followB] = await Promise.all([
        Follow.findOne({ follower: req.user._id, following: contentOwner._id, status: 'accepted' }),
        Follow.findOne({ follower: contentOwner._id, following: req.user._id, status: 'accepted' })
      ]);
      if (!followA || !followB) {
        return res.status(403).json({ success: false, message: 'Only mutual followers can comment' });
      }
    }
  }

  let parentComment = null;
  // If it's a reply, check if parent comment exists
  if (parentCommentId) {
    parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }
  }

  // Create comment
  const comment = await Comment.create({
    user: req.user._id,
    reel: !isAd ? reelId : undefined,
    ad: isAd ? reelId : undefined,
    text: text.trim(),
    parentComment: parentCommentId || null
  });

  // Populate user details
  await comment.populate('user', 'username fullName profilePicture isVerified');

  // Set of mentioned user IDs to avoid double notifications (mention + comment/reply)
  const mentionedUserIds = new Set(
    comment.mentions ? comment.mentions.map(id => id.toString()) : []
  );

  // Trigger mention notifications if any
  if (comment.mentions && comment.mentions.length > 0) {
    comment.mentions.forEach(mentionUserId => {
      // Avoid notifying self
      if (mentionUserId.toString() !== req.user._id.toString()) {
        createNotification({
          recipient: mentionUserId,
          sender: req.user._id,
          type: 'mention',
          reel: reelId,
          comment: comment._id,
          text: 'mentioned you in a comment'
        }).catch(err => console.error('[createComment] Mention notification failed:', err));
      }
    });
  }

  // Trigger comment/reply notifications for Reels (exclude Ads)
  if (!isAd) {
    if (!parentCommentId) {
      // Top-level comment: Notify reel owner
      if (content.user && content.user._id.toString() !== req.user._id.toString() && !mentionedUserIds.has(content.user._id.toString())) {
        createNotification({
          recipient: content.user._id,
          sender: req.user._id,
          type: 'comment',
          reel: reelId,
          comment: comment._id
        }).catch(err => console.error('[createComment] Comment notification failed:', err));
      }
    } else {
      // Reply: Notify parent comment owner
      if (parentComment && parentComment.user.toString() !== req.user._id.toString() && !mentionedUserIds.has(parentComment.user.toString())) {
        createNotification({
          recipient: parentComment.user,
          sender: req.user._id,
          type: 'comment',
          reel: reelId,
          comment: comment._id,
          text: 'replied to your comment'
        }).catch(err => console.error('[createComment] Reply notification failed:', err));
      }
    }
  }

  // Add follow status for Instagram-like experience
  const enrichedComments = await populateCommentWithUserDetails([comment], req.user._id);

  // Broadcast real-time stats update if not an Ad
  if (!isAd) {
    try {
      const io = getIO();
      const updatedReel = await Reel.findById(reelId).select('stats');
      if (updatedReel) {
        io.to('reel:' + String(reelId)).emit('reel_stats_updated', {
          reelId,
          stats: {
            likesCount: updatedReel.stats.likesCount,
            commentsCount: updatedReel.stats.commentsCount,
            sharesCount: updatedReel.stats.sharesCount
          }
        });
      }
    } catch (err) {
      console.error('[createComment] Failed to broadcast real-time comment stats update:', err);
    }
  }

  res.status(201).json({
    success: true,
    message: parentCommentId ? 'Reply added successfully' : 'Comment added successfully',
    comment: enrichedComments[0]
  });
});

/**
 * @desc    Get all comments for a reel (Instagram-like with follow status)
 * @route   GET /api/reels/:reelId/comments
 * @access  Public
 */
export const getReelComments = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'recent'; // 'recent' or 'popular'

  // Check if content exists
  let content = await Reel.findById(reelId).populate('user', 'commentPrivacy blockedCommenters');
  let isAd = false;
  if (!content) {
    content = await Ad.findById(reelId).populate('user', 'commentPrivacy blockedCommenters');
    isAd = true;
  }

  if (!content) {
    return res.status(404).json({
      success: false,
      message: 'Content not found'
    });
  }

  // Check if comments are turned off via privacy settings or individual reel setting (only for reels/user ads)
  if (!isAd && (!content.allowComments || (content.user && content.user.commentPrivacy === 'no_one'))) {
    return res.status(200).json({
      success: true,
      comments: [],
      commentsDisabled: true,
      message: 'Comments are turned off',
      pagination: { currentPage: page, totalPages: 0, totalComments: 0, hasMore: false }
    });
  }

  // Build sort criteria
  let sortCriteria = {};
  if (sortBy === 'popular') {
    sortCriteria = { isPinned: -1, likesCount: -1, createdAt: -1 };
  } else {
    sortCriteria = { isPinned: -1, createdAt: -1 };
  }

  const blockedUsers = [];
  if (content.user && content.user.blockedCommenters && content.user.blockedCommenters.length > 0) {
    blockedUsers.push(...content.user.blockedCommenters.map(id => id.toString()));
  }
  if (req.user && req.user.blockedCommenters && req.user.blockedCommenters.length > 0) {
    blockedUsers.push(...req.user.blockedCommenters.map(id => id.toString()));
  }

  const query = {
    parentComment: null,
    isDeleted: false
  };

  if (isAd) {
    query.ad = reelId;
  } else {
    query.reel = reelId;
  }

  if (blockedUsers.length > 0) {
    query.user = { $nin: [...new Set(blockedUsers)] };
  }

  // Get top-level comments (no parent)
  const comments = await Comment.find(query)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified')
    .lean();

  // Get total count
  const totalComments = await Comment.countDocuments(query);

  // Self-healing commentsCount sync
  if (content && content.stats && content.stats.commentsCount !== totalComments) {
    if (!isAd) {
      await Reel.updateOne({ _id: reelId }, { $set: { 'stats.commentsCount': totalComments } });
    } else {
      await Ad.updateOne({ _id: reelId }, { $set: { 'stats.commentsCount': totalComments } });
    }
    content.stats.commentsCount = totalComments;
  }

  // Enrich with follow status and like status (Instagram-like)
  const enrichedComments = await populateCommentWithUserDetails(
    comments,
    req.user?._id
  );

  // Reply previews (first 2 per comment): fetched in parallel, enriched in one batch.
  const withReplies = enrichedComments.filter(c => c.repliesCount > 0);
  const replyLists = await Promise.all(withReplies.map(comment => {
    const replyQuery = { parentComment: comment._id, isDeleted: false };
    if (blockedUsers.length > 0) replyQuery.user = { $nin: [...new Set(blockedUsers)] };
    return Comment.find(replyQuery)
      .sort({ createdAt: 1 })
      .limit(2)
      .populate('user', 'username fullName profilePicture isVerified')
      .lean();
  }));
  const enrichedReplies = await populateCommentWithUserDetails(replyLists.flat(), req.user?._id);
  let ri = 0;
  withReplies.forEach((comment, i) => {
    comment.replyPreview = enrichedReplies.slice(ri, ri + replyLists[i].length);
    ri += replyLists[i].length;
  });

  let commentsBlocked = false;
  if (req.user && content.user && content.user.blockedCommenters) {
    commentsBlocked = content.user.blockedCommenters.some(id => id.toString() === req.user._id.toString());
  }

  // Check if current user is restricted due to 'friends only' comment privacy
  let commentsMutualOnly = false;
  if (
    req.user &&
    content.user &&
    content.user._id.toString() !== req.user._id.toString() &&
    content.user.commentPrivacy === 'friends'
  ) {
    const [followA, followB] = await Promise.all([
      Follow.findOne({ follower: req.user._id, following: content.user._id, status: 'accepted' }),
      Follow.findOne({ follower: content.user._id, following: req.user._id, status: 'accepted' })
    ]);
    if (!followA || !followB) {
      commentsMutualOnly = true;
    }
  }

  res.status(200).json({
    success: true,
    comments: enrichedComments,
    commentsBlocked,
    commentsMutualOnly,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit),
      totalComments,
      hasMore: skip + comments.length < totalComments
    }
  });
});

/**
 * @desc    Get replies for a specific comment
 * @route   GET /api/comments/:commentId/replies
 * @access  Public
 */
export const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Check if parent comment exists
  const parentComment = await Comment.findById(commentId);
  if (!parentComment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Exclude comments from users blocked by the reel owner or viewing user
  const blockedUsers = [];
  let content = await Reel.findById(parentComment.reel).populate('user', 'blockedCommenters');
  if (!content && parentComment.ad) {
    content = await Ad.findById(parentComment.ad).populate('user', 'blockedCommenters');
  }

  if (content && content.user && content.user.blockedCommenters && content.user.blockedCommenters.length > 0) {
    blockedUsers.push(...content.user.blockedCommenters.map(id => id.toString()));
  }
  if (req.user && req.user.blockedCommenters && req.user.blockedCommenters.length > 0) {
    blockedUsers.push(...req.user.blockedCommenters.map(id => id.toString()));
  }

  const query = {
    parentComment: commentId,
    isDeleted: false
  };

  if (blockedUsers.length > 0) {
    query.user = { $nin: [...new Set(blockedUsers)] };
  }

  // Get replies
  const replies = await Comment.find(query)
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified')
    .lean();

  const totalReplies = await Comment.countDocuments(query);

  // Enrich with follow status
  const enrichedReplies = await populateCommentWithUserDetails(replies, req.user?._id);

  res.status(200).json({
    success: true,
    replies: enrichedReplies,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalReplies / limit),
      totalReplies,
      hasMore: skip + replies.length < totalReplies
    }
  });
});

/**
 * @desc    Like/Unlike a comment
 * @route   POST /api/comments/:commentId/like
 * @access  Private
 */
export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Check if comment exists
  const comment = await Comment.findById(commentId).select('likesCount').lean();
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Try to find and delete existing like
  const existingLike = await Like.findOneAndDelete({
    user: req.user._id,
    comment: new mongoose.Types.ObjectId(commentId)
  });

  const commentObjectId = new mongoose.Types.ObjectId(commentId);

  // Like create/delete are atomic (unique index), so $inc keeps likesCount consistent without scanning likes.
  if (existingLike) {
    const updated = await Comment.findByIdAndUpdate(commentObjectId, { $inc: { likesCount: -1 } }, { new: true, projection: 'likesCount' }).lean();
    res.status(200).json({
      success: true,
      message: 'Comment unliked',
      isLiked: false,
      likesCount: Math.max(0, updated?.likesCount || 0)
    });
  } else {
    try {
      await Like.create({ user: req.user._id, comment: commentObjectId });
    } catch (err) {
      if (err.code !== 11000) throw err;
      return res.status(200).json({ success: true, message: 'Comment liked', isLiked: true, likesCount: Math.max(comment.likesCount || 0, 1) });
    }
    const updated = await Comment.findByIdAndUpdate(commentObjectId, { $inc: { likesCount: 1 } }, { new: true, projection: 'likesCount' }).lean();
    res.status(200).json({
      success: true,
      message: 'Comment liked',
      isLiked: true,
      likesCount: updated?.likesCount || 1
    });
  }
});

/**
 * @desc    Delete a comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check if user is the comment owner or reel owner
  const reel = await Reel.findById(comment.reel);
  const isCommentOwner = comment.user.toString() === req.user._id.toString();
  const isReelOwner = reel.user.toString() === req.user._id.toString();

  if (!isCommentOwner && !isReelOwner) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to delete this comment'
    });
  }

  // Soft delete
  comment.isDeleted = true;
  comment.text = '[Comment deleted]';
  await comment.save();

  // Broadcast real-time stats update if it was on a Reel
  if (comment.reel) {
    try {
      const io = getIO();
      const updatedReel = await Reel.findById(comment.reel).select('stats');
      if (updatedReel) {
        io.to('reel:' + String(comment.reel.toString())).emit('reel_stats_updated', {
          reelId: comment.reel.toString(),
          stats: {
            likesCount: updatedReel.stats.likesCount,
            commentsCount: updatedReel.stats.commentsCount,
            sharesCount: updatedReel.stats.sharesCount
          }
        });
      }
    } catch (err) {
      console.error('[deleteComment] Failed to broadcast real-time comment stats update:', err);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully'
  });
});

/**
 * @desc    Pin/Unpin a comment (reel owner only)
 * @route   PUT /api/comments/:commentId/pin
 * @access  Private
 */
export const togglePinComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check if user is the reel owner
  const reel = await Reel.findById(comment.reel);
  if (reel.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the reel owner can pin comments'
    });
  }

  // Toggle pin status
  comment.isPinned = !comment.isPinned;
  await comment.save();

  res.status(200).json({
    success: true,
    message: comment.isPinned ? 'Comment pinned' : 'Comment unpinned',
    isPinned: comment.isPinned
  });
});

/**
 * @desc    Edit a comment
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
export const editComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
    });
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check if user is the comment owner
  if (comment.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own comments'
    });
  }

  comment.text = text.trim();
  comment.isEdited = true;
  await comment.save();

  await comment.populate('user', 'username fullName profilePicture isVerified');
  const enrichedComments = await populateCommentWithUserDetails([comment], req.user._id);

  res.status(200).json({
    success: true,
    message: 'Comment updated successfully',
    comment: enrichedComments[0]
  });
});
