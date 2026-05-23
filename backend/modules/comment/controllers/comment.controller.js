import mongoose from 'mongoose';
import Comment from '../../../models/Comment.model.js';
import Reel from '../../../models/Reel.model.js';
import Ad from '../../../models/Ad.model.js';
import User from '../../../models/User.model.js';
import Follow from '../../../models/Follow.model.js';
import Like from '../../../models/Like.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { createNotification } from '../../../utils/notificationService.js';

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
  let actualCounts = {};
  
  if (commentIds.length > 0) {
    const commentObjectIds = commentIds.map(id => new mongoose.Types.ObjectId(id));
    
    // 1. Get real-time like counts for all comments in one aggregation (Self-healing)
    const counts = await Like.aggregate([
      { $match: { comment: { $in: commentObjectIds } } },
      { $group: { _id: '$comment', count: { $sum: 1 } } }
    ]);
    
    actualCounts = counts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    // 2. Get current user's like status
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
      console.log(`[Enrichment] User: ${currentUserId} | Comments: ${commentIds.length} | Likes found: ${likes.length}`);
    }
  }

  // Add follow and like status to each comment
  return Promise.all(comments.map(async (comment) => {
    const commentObj = comment.toObject ? comment.toObject() : comment;
    const commentIdStr = (commentObj._id || commentObj.id)?.toString();
    const userId = commentObj.user?._id || commentObj.user;
    
    // Sync the likesCount in the database if it's out of sync (End-to-end reliability)
    const trueCount = actualCounts[commentIdStr] || 0;
    if (commentObj.likesCount !== trueCount) {
      await Comment.updateOne({ _id: commentObj._id || commentObj.id }, { $set: { likesCount: trueCount } });
    }

    const isLiked = commentIdStr ? !!likeStatuses[commentIdStr] : false;

    return {
      ...commentObj,
      likesCount: trueCount,
      isFollowing: userId ? (followStatuses[userId.toString()] || false) : false,
      isOwnComment: (currentUserId && userId) ? userId.toString() === currentUserId.toString() : false,
      isLiked
    };
  }));
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
  let content = await Reel.findById(reelId).populate('user', 'commentPrivacy');
  let isAd = false;
  
  if (!content) {
    content = await Ad.findById(reelId);
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

  // Update comment count on the parent content
  if (!parentCommentId) {
    if (isAd) {
      await Ad.findByIdAndUpdate(reelId, { $inc: { 'stats.commentsCount': 1 } });
    } else {
      await Reel.findByIdAndUpdate(reelId, { $inc: { 'stats.commentsCount': 1 } });
    }
  }

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
  let content = await Reel.findById(reelId).populate('user', 'commentPrivacy');
  let isAd = false;
  if (!content) {
    content = await Ad.findById(reelId);
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

  const query = {
    parentComment: null,
    isDeleted: false
  };

  if (isAd) {
    query.ad = reelId;
  } else {
    query.reel = reelId;
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

  // Enrich with follow status and like status (Instagram-like)
  const enrichedComments = await populateCommentWithUserDetails(
    comments,
    req.user?._id
  );

  // For each comment, get a preview of replies (first 2)
  for (let comment of enrichedComments) {
    if (comment.repliesCount > 0) {
      const replies = await Comment.find({
        parentComment: comment._id,
        isDeleted: false
      })
        .sort({ createdAt: 1 })
        .limit(2)
        .populate('user', 'username fullName profilePicture isVerified')
        .lean();

      comment.replyPreview = await populateCommentWithUserDetails(replies, req.user?._id);
    }
  }

  res.status(200).json({
    success: true,
    comments: enrichedComments,
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

  // Get replies
  const replies = await Comment.find({
    parentComment: commentId,
    isDeleted: false
  })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified')
    .lean();

  const totalReplies = await Comment.countDocuments({
    parentComment: commentId,
    isDeleted: false
  });

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
  const comment = await Comment.findById(commentId);
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

  if (existingLike) {
    // Unliked
    const actualLikesCount = await Like.countDocuments({ comment: commentObjectId });
    await Comment.updateOne({ _id: commentObjectId }, { $set: { likesCount: actualLikesCount } });
    
    console.log(`[Like] DELETED. Comment: ${commentId} | Remaining: ${actualLikesCount}`);
    
    res.status(200).json({
      success: true,
      message: 'Comment unliked',
      isLiked: false,
      likesCount: actualLikesCount
    });
  } else {
    // Like
    try {
      // Check if already exists
      let likeDoc = await Like.findOne({ user: req.user._id, comment: commentObjectId });
      if (!likeDoc) {
        likeDoc = await Like.create({
          user: req.user._id,
          comment: commentObjectId
        });
        console.log(`[Like] CREATED. ID: ${likeDoc._id} | User: ${req.user._id} | Comment: ${commentId}`);
      }
      
      // Verification: actually find all likes for this comment
      const allLikes = await Like.find({ comment: commentObjectId }).lean();
      const actualCount = allLikes.length;
      
      // Force sync
      await Comment.updateOne({ _id: commentObjectId }, { $set: { likesCount: actualCount } });
      
      console.log(`[Like] VERIFIED. Comment: ${commentId} | Total Likes: ${actualCount}`);
      
      res.status(200).json({
        success: true,
        message: 'Comment liked',
        isLiked: true,
        likesCount: actualCount
      });
    } catch (err) {
      if (err.code === 11000) {
        const actualCount = await Like.countDocuments({ comment: commentObjectId });
        return res.status(200).json({
          success: true,
          message: 'Comment liked',
          isLiked: true,
          likesCount: Math.max(actualCount, 1)
        });
      }
      console.error('[Like] ERROR:', err);
      throw err;
    }
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
