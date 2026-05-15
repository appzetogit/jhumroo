import mongoose from 'mongoose';
import Reel from '../../../models/Reel.model.js';
import Ad from '../../../models/Ad.model.js';
import Like from '../../../models/Like.model.js';
import SavedReel from '../../../models/SavedReel.model.js';
import Comment from '../../../models/Comment.model.js';
import User from '../../../models/User.model.js';
import Follow from '../../../models/Follow.model.js';
import Report from '../../../models/Report.model.js';
import { createNotification } from '../../../utils/notificationService.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { uploadToS3, getPresignedUploadUrl, getFileUrl } from '../../../utils/s3.js';
import { processReelWithAudio } from '../../../utils/videoProcessor.js';
import { deleteFile } from '../../../config/cloudinary.js';
import fs from 'fs';

/**
 * Helper to handle mention notifications for Reels
 */
const handleMentionNotifications = (reel, currentUserId) => {
  if (reel.mentions && reel.mentions.length > 0) {
    reel.mentions.forEach(mentionUserId => {
      if (mentionUserId.toString() !== currentUserId.toString()) {
        createNotification({
          recipient: mentionUserId,
          sender: currentUserId,
          type: 'mention',
          reel: reel._id,
          text: 'mentioned you in a post'
        }).catch(err => console.error('[handleMentionNotifications] failed:', err));
      }
    });
  }
};

/**
 * @desc    Get presigned URL for direct S3 upload
 * @route   POST /api/reels/create-upload-url
 * @access  Private
 */
export const createUploadUrl = asyncHandler(async (req, res) => {
  const { contentType, fileName } = req.body;
  const videoId = new mongoose.Types.ObjectId();
  const key = `uploads/raw/${req.user._id}/${videoId}-${fileName}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  res.status(200).json({
    success: true,
    uploadUrl,
    key,
    videoId
  });
});

/**
 * @desc    Mark upload as complete and trigger processing
 * @route   POST /api/reels/complete-upload
 * @access  Private
 */
export const completeUpload = asyncHandler(async (req, res) => {
  const { 
    videoId, 
    key, 
    caption, 
    audience, 
    allowComments, 
    allowDuet, 
    allowStitch, 
    allowDownload, 
    highQuality,
    saveToDevice,
    autoCaptions,
    captionLanguage,
    isAgeRestricted,
    location, 
    music,
    edits 
  } = req.body;

  // Create initial reel record
  const reel = await Reel.create({
    _id: videoId,
    user: req.user._id,
    video: {
      url: await getFileUrl(key),
      publicId: key,
      duration: 0, // Will be updated after processing
    },
    rawVideoUrl: await getFileUrl(key),
    caption: caption || '',
    audience: audience || 'everyone',
    allowComments: allowComments !== 'false' && allowComments !== false,
    allowDuet: allowDuet !== 'false' && allowDuet !== false,
    allowStitch: allowStitch !== 'false' && allowStitch !== false,
    allowDownload: allowDownload !== 'false' && allowDownload !== false,
    highQuality: highQuality !== 'false' && highQuality !== false,
    saveToDevice: saveToDevice !== 'false' && saveToDevice !== false,
    autoCaptions: autoCaptions !== 'false' && autoCaptions !== false,
    captionLanguage: captionLanguage || 'English',
    isAgeRestricted: isAgeRestricted === 'true' || isAgeRestricted === true,
    location: location ? (typeof location === 'string' ? JSON.parse(location) : location) : undefined,
    music: music ? {
      name: music.title || music.name || 'Original Sound',
      artist: music.artist || 'Original Artist',
      url: music.url,
      thumbnail: music.thumbnail || '',
      audioId: music._id || music.id,
      startTime: music.clipStart || music.startTime || 0,
      duration: music.clipDuration || music.duration || 15
    } : undefined,
    edits: edits ? (typeof edits === 'string' ? JSON.parse(edits) : edits) : undefined,
    status: 'pending'
  });

  // Update user reel count
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'stats.reelsCount': 1 }
  });

  // Handle mentions
  handleMentionNotifications(reel, req.user._id);

  // Trigger background processing (Audio Merging)
  reel.status = 'processing';
  await reel.save();

  // Non-blocking processing
  processReelWithAudio(reel._id, key, reel.music)
    .then(async (processed) => {
      console.log(`[ReelController] Processing successful for ${reel._id}`);
      await Reel.findByIdAndUpdate(reel._id, {
        'video.url': processed.videoUrl,
        'video.publicId': processed.videoKey,
        'video.thumbnail': processed.thumbnailUrl,
        'video.duration': processed.duration || 0,
        status: 'completed'
      });
    })
    .catch(async (err) => {
      console.error(`[ReelController] Processing failed for ${reel._id}:`, err);
      await Reel.findByIdAndUpdate(reel._id, { status: 'failed' });
    });

  res.status(201).json({
    success: true,
    message: 'Upload completed, processing started',
    reel
  });
});

/**
 * @desc    Create a new reel (Legacy / Small files)
 * @route   POST /api/reels
 * @access  Private
 */
export const createReel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a video'
    });
  }

  const { 
    caption, 
    musicName, 
    allowComments, 
    allowDuet, 
    allowStitch, 
    allowDownload, 
    highQuality,
    saveToDevice,
    autoCaptions,
    captionLanguage,
    isAgeRestricted,
    location, 
    music,
    edits, 
    audience 
  } = req.body;

  // Upload video to AWS S3
  const s3Result = await uploadToS3(req.file.path, 'reels', req.file.mimetype);

  // Delete temp file
  fs.unlinkSync(req.file.path);

  // Create reel
  const reel = await Reel.create({
    user: req.user._id,
    video: {
      url: await getFileUrl(s3Result.key),
      publicId: s3Result.key,
      thumbnail: '', // Thumbnail generation could be added later
      duration: 0, // Duration should be sent from frontend or extracted
      format: req.file.mimetype.split('/')[1]
    },
    caption: caption || '',
    music: music ? {
      name: music.title || music.name || 'Original Sound',
      artist: music.artist || 'Original Artist',
      url: music.url,
      thumbnail: music.thumbnail || '',
      audioId: music._id || music.id,
      startTime: music.clipStart || music.startTime || 0,
      duration: music.clipDuration || music.duration || 15
    } : {
      name: musicName || 'Original Sound',
      thumbnail: '',
      startTime: 0,
      duration: 15
    },
    allowComments: allowComments !== 'false' && allowComments !== false,
    allowDuet: allowDuet !== 'false' && allowDuet !== false,
    allowStitch: allowStitch !== 'false' && allowStitch !== false,
    allowDownload: allowDownload !== 'false' && allowDownload !== false,
    highQuality: highQuality !== 'false' && highQuality !== false,
    saveToDevice: saveToDevice !== 'false' && saveToDevice !== false,
    autoCaptions: autoCaptions !== 'false' && autoCaptions !== false,
    captionLanguage: captionLanguage || 'English',
    isAgeRestricted: isAgeRestricted === 'true' || isAgeRestricted === true,
    location: location ? (typeof location === 'string' ? JSON.parse(location) : location) : undefined,
    edits: edits ? (typeof edits === 'string' ? JSON.parse(edits) : edits) : undefined,
    audience: audience || 'everyone'
  });

  // Update user reel count
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'stats.reelsCount': 1 }
  });

  // Handle mentions
  handleMentionNotifications(reel, req.user._id);

  // Trigger background processing for uploaded files
  processReelWithAudio(reel._id, s3Result.key, reel.music)
    .then(async (processed) => {
      await Reel.findByIdAndUpdate(reel._id, {
        'video.url': processed.videoUrl,
        'video.publicId': processed.videoKey,
        'video.thumbnail': processed.thumbnailUrl,
        'video.duration': processed.duration || 0,
        status: 'completed'
      });
    })
    .catch(async (err) => {
       console.error(`[ReelController] createReel processing failed:`, err);
    });

  await reel.populate('user', 'username fullName profilePicture isVerified downloadPrivacy');

  res.status(201).json({
    success: true,
    message: 'Reel created successfully',
    reel
  });
});

/**
 * @desc    Get feed reels (For You page)
 * @route   GET /api/reels/feed
 * @access  Public
 */

export const getFeedReels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { isActive: true };
  
  if (!req.user) {
    query.audience = 'everyone';
  } else {
    // Get users that current user is following (to see their 'followers' only reels)
    const following = await Follow.find({ follower: req.user._id, status: 'accepted' }).select('following');
    const followingIds = following.map(f => f.following);
    
    // Get users that follow current user (to see their 'following' only reels)
    const followers = await Follow.find({ following: req.user._id, status: 'accepted' }).select('follower');
    const followerIds = followers.map(f => f.follower);

    query.$or = [
      { audience: 'everyone' },
      { user: req.user._id },
      { user: { $in: followingIds }, audience: 'followers' },
      { user: { $in: followerIds }, audience: 'following' }
    ];
  }

  const reels = await Reel.find(query)
    .sort({ 'stats.viewsCount': -1, 'stats.likesCount': -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified downloadPrivacy')
    .populate('music.audioId')
    .lean();

  // Fetch and inject ads if user is authenticated
  if (req.user) {
    const userState = req.user.state;
    const adQuery = { isActive: true };
    if (userState) {
      adQuery.$or = [
        { targetStates: { $size: 0 } },
        { targetStates: userState }
      ];
    }

    const ads = await Ad.find(adQuery)
      .populate('user', 'username profilePicture isVerified')
      .limit(2)
      .lean();

    if (ads.length > 0) {
      ads.forEach((ad, index) => {
        const formattedAd = {
          ...ad,
          _id: ad._id.toString(),
          isAd: true,
          onModel: ad.onModel || 'User',
          video: {
            url: ad.media.url,
            type: ad.media.type,
            thumbnail: ad.media.thumbnail || ad.media.url
          },
          stats: {
            likesCount: ad.stats?.likesCount || 0,
            viewsCount: ad.stats?.viewsCount || 0,
            commentsCount: ad.stats?.commentsCount || 0,
            sharesCount: ad.stats?.sharesCount || 0,
            savesCount: ad.stats?.savesCount || 0
          }
        };
        // Inject ad at positions (e.g., 3rd and 7th)
        const insertIndex = index === 0 ? 3 : 7;
        if (reels.length >= insertIndex) {
          reels.splice(insertIndex, 0, formattedAd);
        } else if (reels.length > 0 && index === 0) {
          reels.push(formattedAd);
        }
      });
    }

    // Add liked and saved status
    const reelIds = reels.filter(r => !r.isAd).map(r => r._id);
    const adIds = reels.filter(r => r.isAd).map(r => r._id);

    const [likes, adLikes, saves, adSaves] = await Promise.all([
      Like.find({ user: req.user._id, reel: { $in: reelIds } }),
      Like.find({ user: req.user._id, ad: { $in: adIds } }),
      SavedReel.find({ user: req.user._id, reel: { $in: reelIds } }),
      SavedReel.find({ user: req.user._id, ad: { $in: adIds } })
    ]);
    
    const likedReelIds = new Set(likes.map(l => l.reel.toString()));
    const likedAdIds = new Set(adLikes.map(l => l.ad.toString()));
    const savedReelIds = new Set(saves.map(s => s.reel.toString()));
    const savedAdIds = new Set(adSaves.map(s => s.ad.toString()));
 
    for (const item of reels) {
      if (item.isAd) {
        item.isLiked = likedAdIds.has(item._id.toString());
        item.isSaved = savedAdIds.has(item._id.toString());
      } else {
        item.isLiked = likedReelIds.has(item._id.toString());
        item.isSaved = savedReelIds.has(item._id.toString());
      }
    }
  }

  res.status(200).json({
    success: true,
    reels,
    pagination: {
      page,
      limit,
      hasMore: reels.length >= limit
    }
  });
});

/**
 * @desc    Get following reels
 * @route   GET /api/reels/following
 * @access  Private
 */
export const getFollowingReels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get users that current user is following
  const following = await Follow.find({ follower: req.user._id, status: 'accepted' })
    .select('following');
  const followingIds = following.map(f => f.following);

  // Get users that follow current user (to see their 'following' only reels)
  const followers = await Follow.find({ following: req.user._id, status: 'accepted' }).select('follower');
  const followerIds = followers.map(f => f.follower);

  // Get reels from followed users that current user is allowed to see
  const reels = await Reel.find({ 
    user: { $in: followingIds },
    isActive: true,
    $or: [
      { audience: 'everyone' },
      { audience: 'followers' },
      { user: { $in: followerIds }, audience: 'following' }
    ]
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified downloadPrivacy')
    .populate('music.audioId')
    .lean();

  // Add liked and saved status
  const reelIds = reels.map(r => r._id);
  const [likes, saves] = await Promise.all([
    Like.find({ user: req.user._id, reel: { $in: reelIds } }),
    SavedReel.find({ user: req.user._id, reel: { $in: reelIds } })
  ]);
  
  const likedReelIds = new Set(likes.map(l => l.reel.toString()));
  const savedReelIds = new Set(saves.map(s => s.reel.toString()));

  for (const reel of reels) {
    reel.isLiked = likedReelIds.has(reel._id.toString());
    reel.isSaved = savedReelIds.has(reel._id.toString());
  }

  res.status(200).json({
    success: true,
    reels,
    pagination: {
      page,
      limit,
      hasMore: reels.length === limit
    }
  });
});

/**
 * @desc    Get single reel
 * @route   GET /api/reels/:id
 * @access  Public
 */
export const getReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id)
    .populate('user', 'username fullName profilePicture isVerified downloadPrivacy')
    .populate('music.audioId')
    .lean();

  if (!reel) {
    return res.status(404).json({
      success: false,
      message: 'Reel not found'
    });
  }

  // Add liked and saved status if user is authenticated
  if (req.user) {
    const [like, save] = await Promise.all([
      Like.findOne({ user: req.user._id, reel: req.params.id }),
      SavedReel.findOne({ user: req.user._id, reel: req.params.id })
    ]);
    reel.isLiked = !!like;
    reel.isSaved = !!save;
  }

  res.status(200).json({
    success: true,
    reel
  });
});

/**
 * @desc    Delete reel
 * @route   DELETE /api/reels/:id
 * @access  Private
 */
export const deleteReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);

  if (!reel) {
    return res.status(404).json({
      success: false,
      message: 'Reel not found'
    });
  }

  // Check if user owns the reel
  if (reel.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this reel'
    });
  }

  // Delete video from Cloudinary
  await deleteFile(reel.video.publicId, 'video');

  // Get the number of likes to decrement from user stats
  const likesToDecrement = reel.stats?.likesCount || 0;

  // Delete all likes associated with this reel
  await Like.deleteMany({ reel: reel._id });

  // Delete reel
  await reel.deleteOne();

  // Update user stats: decrement reel count AND total likes received
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 
      'stats.reelsCount': -1,
      'stats.likesCount': -likesToDecrement
    }
  });

  // Ensure stats don't go below zero
  await User.updateOne(
    { _id: req.user._id, 'stats.likesCount': { $lt: 0 } },
    { $set: { 'stats.likesCount': 0 } }
  );

  res.status(200).json({
    success: true,
    message: 'Reel deleted successfully'
  });
});

/**
 * @desc    Like/Unlike reel
 * @route   POST /api/reels/:id/like
 * @access  Private
 */
export const toggleLike = asyncHandler(async (req, res) => {
  const { id: contentId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(contentId)) {
    return res.status(400).json({ success: false, message: 'Invalid ID' });
  }

  const cId = new mongoose.Types.ObjectId(contentId);
  const uId = new mongoose.Types.ObjectId(userId);

  // 1. Find the content (Reel or Ad)
  let content = await Reel.findById(cId);
  let isAd = false;
  
  if (!content) {
    content = await Ad.findById(cId);
    isAd = true;
  }

  if (!content) {
    return res.status(404).json({ success: false, message: 'Content not found' });
  }

  // 2. Try to find and remove an existing like (Atomic operation)
  const query = isAd ? { user: uId, ad: cId } : { user: uId, reel: cId };
  const existingLike = await Like.findOneAndDelete(query);
  
  if (existingLike) {
    // ─── UNLIKE FLOW ───
    let updatedContent;
    if (isAd) {
      updatedContent = await Ad.findByIdAndUpdate(
        cId,
        { $inc: { 'stats.likesCount': -1 } },
        { new: true }
      );
    } else {
      updatedContent = await Reel.findByIdAndUpdate(
        cId,
        { $inc: { 'stats.likesCount': -1 } },
        { new: true }
      );

      // Update owner's total likes count for reels
      if (content.user) {
        await User.updateOne(
          { _id: content.user },
          { $inc: { 'stats.likesCount': -1 } }
        ).catch(err => console.error('[toggleLike] User stats update failed:', err));
      }
    }

    return res.status(200).json({
      success: true,
      isLiked: false,
      likesCount: Math.max(0, updatedContent?.stats?.likesCount || 0)
    });
  } else {
    // ─── LIKE FLOW ───
    try {
      await Like.create(isAd ? { user: uId, ad: cId } : { user: uId, reel: cId });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(200).json({
          success: true,
          isLiked: true,
          likesCount: content.stats?.likesCount || 0
        });
      }
      throw err;
    }

    let updatedContent;
    if (isAd) {
      updatedContent = await Ad.findByIdAndUpdate(
        cId,
        { $inc: { 'stats.likesCount': 1 } },
        { new: true }
      );
    } else {
      updatedContent = await Reel.findByIdAndUpdate(
        cId,
        { $inc: { 'stats.likesCount': 1 } },
        { new: true }
      );

      // Update owner's total likes count for reels
      if (content.user) {
        await User.updateOne(
          { _id: content.user },
          { $inc: { 'stats.likesCount': 1 } }
        ).catch(err => console.error('[toggleLike] User stats update failed:', err));

        // Create notification for owner (if not liking own reel)
        if (content.user.toString() !== uId.toString()) {
          createNotification({
            recipient: content.user,
            sender: uId,
            type: 'like',
            reel: cId,
            message: `${req.user.username} liked your reel`
          }).catch(err => console.error('[toggleLike] Notification failed:', err));
        }
      }
    }

    return res.status(200).json({
      success: true,
      isLiked: true,
      likesCount: updatedContent?.stats?.likesCount || 0
    });
  }
});

/**
 * @desc    Save/Unsave reel
 * @route   POST /api/reels/:id/save
 */
export const toggleSave = asyncHandler(async (req, res) => {
  const { id: contentId } = req.params;
  const userId = req.user._id;
  const { collection = 'All Videos' } = req.body;

  if (!mongoose.Types.ObjectId.isValid(contentId)) {
    return res.status(400).json({ success: false, message: 'Invalid ID' });
  }

  const cId = new mongoose.Types.ObjectId(contentId);

  // 1. Find the content (Reel or Ad)
  let content = await Reel.findById(cId);
  let isAd = false;
  if (!content) {
    content = await Ad.findById(cId);
    isAd = true;
  }

  if (!content) {
    return res.status(404).json({ success: false, message: 'Content not found' });
  }

  // 2. Check if already saved
  const query = isAd ? { user: userId, ad: cId } : { user: userId, reel: cId };
  const existingSave = await SavedReel.findOne(query);

  if (existingSave) {
    // ─── UNSAVE FLOW ───
    await SavedReel.findOneAndDelete({ _id: existingSave._id });
    
    return res.status(200).json({
      success: true,
      message: 'Unsaved successfully',
      isSaved: false
    });
  } else {
    // ─── SAVE FLOW ───
    await SavedReel.create({
      user: userId,
      reel: !isAd ? cId : undefined,
      ad: isAd ? cId : undefined,
      collection
    });

    return res.status(200).json({
      success: true,
      message: 'Saved successfully',
      isSaved: true
    });
  }
});

/**
 * @desc    Increment view count
 * @route   POST /api/reels/:id/view
 * @access  Public
 */
export const addView = asyncHandler(async (req, res) => {
  const { id: reelId } = req.params;
  const userId = req.user?._id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // ─── Unique View Logic ───
  // If user is logged in, only count view if they haven't seen it before
  if (userId) {
    const hasViewed = reel.views.some(v => v.user && v.user.toString() === userId.toString());
    
    if (!hasViewed) {
      // First time viewing: increment count and add to tracking array
      const updatedReel = await Reel.findByIdAndUpdate(
        reelId,
        { 
          $inc: { 'stats.viewsCount': 1 },
          $push: { views: { user: userId, viewedAt: new Date() } }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        isNewView: true,
        viewsCount: updatedReel.stats.viewsCount
      });
    } else {
      // Already viewed: just return current count without incrementing
      return res.status(200).json({
        success: true,
        isNewView: false,
        viewsCount: reel.stats.viewsCount
      });
    }
  } else {
    // Guest user: Simple increment (or you could track by IP/Fingerprint if needed)
    // For now, let's keep it simple for guests
    const updatedReel = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { 'stats.viewsCount': 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      isNewView: true,
      viewsCount: updatedReel.stats.viewsCount
    });
  }
});

/**
 * @desc    Search reels by hashtag or keyword
 * @route   GET /api/reels/search
 * @access  Public
 */
export const searchReels = asyncHandler(async (req, res) => {
  const { q, hashtag } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = { isActive: true };

  if (hashtag) {
    query.hashtags = hashtag.toLowerCase();
  } else if (q) {
    query.$or = [
      { caption: { $regex: q, $options: 'i' } },
      { 'music.name': { $regex: q, $options: 'i' } },
      { 'music.artist': { $regex: q, $options: 'i' } }
    ];
  } else {
    return res.status(400).json({
      success: false,
      message: 'Search query or hashtag is required'
    });
  }

  const reels = await Reel.find(query)
    .sort({ 'stats.viewsCount': -1, createdAt: -1 })
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
 * @desc    Report a reel
 * @route   POST /api/reels/:id/report
 * @access  Private
 */
export const reportReel = asyncHandler(async (req, res) => {
  const { reason, description } = req.body;
  const reelId = req.params.id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // Prevent duplicate reports from same user on same reel
  const existingReport = await Report.findOne({
    reportedBy: req.user._id,
    reportedItem: reelId,
    reportType: 'Reel'
  });

  if (existingReport) {
    return res.status(400).json({
      success: false,
      message: 'You have already reported this reel'
    });
  }

  await Report.create({
    reportedBy: req.user._id,
    reportType: 'Reel',
    reportedItem: reelId,
    reason,
    description
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for reporting. We will review it shortly.'
  });
});

/**
 * @desc    Edit reel metadata (Caption, hashtags, permissions)
 * @route   PUT /api/reels/:id
 * @access  Private (Owner only)
 */
export const editReel = asyncHandler(async (req, res) => {
  const { caption, allowComments, allowDuet, allowStitch, allowDownload, audience } = req.body;
  const reel = await Reel.findById(req.params.id);

  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  if (reel.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  let thumbnailUrl = reel.video?.thumbnail;
  if (req.file) {
    // Upload new thumbnail to AWS S3
    const s3Result = await uploadToS3(req.file.path, 'thumbnails', req.file.mimetype);
    thumbnailUrl = await getFileUrl(s3Result.key);
    // Delete temp file
    fs.unlinkSync(req.file.path);
  }

  // Update fields
  if (caption !== undefined) reel.caption = caption;
  if (thumbnailUrl !== undefined) reel.video.thumbnail = thumbnailUrl;
  if (allowComments !== undefined) reel.allowComments = (allowComments === 'true' || allowComments === true);
  if (allowDuet !== undefined) reel.allowDuet = (allowDuet === 'true' || allowDuet === true);
  if (allowStitch !== undefined) reel.allowStitch = (allowStitch === 'true' || allowStitch === true);
  if (allowDownload !== undefined) reel.allowDownload = (allowDownload === 'true' || allowDownload === true);
  if (audience !== undefined) reel.audience = audience;

  await reel.save();
  await reel.populate('user', 'username fullName profilePicture isVerified');

  // Handle mentions (only if caption was modified)
  if (caption !== undefined) {
    handleMentionNotifications(reel, req.user._id);
  }

  res.status(200).json({
    success: true,
    message: 'Reel updated successfully',
    reel
  });
});

/**
 * @desc    Get user's saved collections
 * @route   GET /api/reels/saved/collections
 * @access  Private
 */
export const getSavedCollections = asyncHandler(async (req, res) => {
  const collections = await SavedReel.distinct('collection', { user: req.user._id });
  
  res.status(200).json({
    success: true,
    collections: collections.length > 0 ? collections : ['All Videos']
  });
});

/**
 * @desc    Share reel (increment share count)
 * @route   POST /api/reels/:id/share
 * @access  Public
 */
export const shareReel = asyncHandler(async (req, res) => {
  const { id: reelId } = req.params;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // Increment share count
  const updatedReel = await Reel.findByIdAndUpdate(
    reelId,
    { $inc: { 'stats.sharesCount': 1 } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Reel shared successfully',
    sharesCount: updatedReel.stats.sharesCount
  });
});

/**
 * @desc    Get trending reels (Most popular)
 * @route   GET /api/reels/trending
 * @access  Public
 */
export const getTrendingReels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Trending sorts primarily by views and likes, then recency
  const reels = await Reel.find({ isActive: true, audience: 'everyone' })
    .sort({ 'stats.viewsCount': -1, 'stats.likesCount': -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified')
    .populate('music.audioId')
    .lean();

  // Add liked and saved status if user is authenticated
  if (req.user) {
    const reelIds = reels.map(r => r._id);
    const [likes, saves] = await Promise.all([
      Like.find({ user: req.user._id, reel: { $in: reelIds } }),
      SavedReel.find({ user: req.user._id, reel: { $in: reelIds } })
    ]);
    
    const likedReelIds = new Set(likes.map(l => l.reel.toString()));
    const savedReelIds = new Set(saves.map(s => s.reel.toString()));

    for (const reel of reels) {
      reel.isLiked = likedReelIds.has(reel._id.toString());
      reel.isSaved = savedReelIds.has(reel._id.toString());
    }
  }

  res.status(200).json({
    success: true,
    reels,
    pagination: {
      page,
      limit,
      hasMore: reels.length === limit
    }
  });
});


