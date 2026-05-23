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
import { uploadToS3, getPresignedUploadUrl, getFileUrl, getPresignedDownloadUrl, deleteFromS3 } from '../../../utils/s3.js';
import { processReelWithAudio } from '../../../utils/videoProcessor.js';
import { deleteFile } from '../../../config/cloudinary.js';
import RecommendationEngine from '../../../utils/recommendationEngine.js';
import WatchAnalytics from '../../../models/WatchAnalytics.model.js';
import { isUserAllowedToViewReels } from '../../../utils/geoHelper.js';
import fs from 'fs';
import axios from 'axios';

/**
 * Safely parses location fields from the client
 */
const parseLocation = (loc) => {
  if (!loc) return undefined;
  if (typeof loc === 'object') {
    return loc.name ? loc : { name: loc.title || loc.name };
  }
  if (typeof loc === 'string') {
    try {
      const parsed = JSON.parse(loc);
      if (parsed && typeof parsed === 'object') {
        return parsed.name ? parsed : { name: parsed.title || parsed.name || loc };
      }
    } catch (e) {
      // Plain text location string
      return { name: loc };
    }
  }
  return undefined;
};

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
    edits,
    thumbnailUrl  // Optional: client-generated cover thumbnail
  } = req.body;

  // Get raw video URL
  const rawUrl = await getFileUrl(key);

  // Create reel record — mark as 'completed' immediately so it shows
  // in the feed right away. Background processing will update the
  // video URL and thumbnail once FFmpeg finishes.
  const reel = await Reel.create({
    _id: videoId,
    user: req.user._id,
    video: {
      url: rawUrl,
      publicId: key,
      thumbnail: thumbnailUrl || '', // Use client-provided thumbnail if available
      duration: 0, // Will be updated after processing
    },
    rawVideoUrl: rawUrl,
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
    location: parseLocation(location),
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
    status: 'completed'  // Immediately visible in feed
  });

  // Update user reel count
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'stats.reelsCount': 1 }
  });

  // Handle mentions
  handleMentionNotifications(reel, req.user._id);

  // Non-blocking background processing (merges audio, extracts duration)
  // This will update the video URL and thumbnail once done.
  processReelWithAudio(reel._id, key, reel.music)
    .then(async (processed) => {
      console.log(`[ReelController] Processing successful for ${reel._id}`);
      await Reel.findByIdAndUpdate(reel._id, {
        'video.url': processed.videoUrl,
        'video.publicId': processed.videoKey,
        // Only overwrite thumbnail if client didn't provide one
        ...(!thumbnailUrl && { 'video.thumbnail': processed.thumbnailUrl }),
        'video.duration': processed.duration || 0,
      });
    })
    .catch(async (err) => {
      // Processing failed (e.g. FFmpeg not on live server) — reel is
      // already 'completed' with raw URL, so no further action needed.
      console.error(`[ReelController] Background processing failed for ${reel._id}:`, err);
    });

  res.status(201).json({
    success: true,
    message: 'Reel published successfully',
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
    location: parseLocation(location),
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
       // Fallback: If processing fails, mark as completed using the raw video URL and fallback thumbnail
       const fallbackUrl = reel.video?.url || (await getFileUrl(s3Result.key));
       await Reel.findByIdAndUpdate(reel._id, {
         'video.url': fallbackUrl,
         'video.thumbnail': '',
         status: 'completed'
       });
       console.log(`[ReelController] Gracefully fell back to completed status for reel ${reel._id} in createReel`);
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
  // Global geo-targeting check
  const isAllowed = await isUserAllowedToViewReels(req);
  if (!isAllowed) {
    return res.status(200).json({
      success: true,
      reels: [],
      pagination: { pages: 0, page: 1, hasMore: false }
    });
  }

  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  const cursor = req.query.cursor; // Format: base64(score_id)

  let lastScore = undefined;
  let lastId = null;
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('ascii');
      const [s, id] = decoded.split('_');
      lastScore = parseFloat(s);
      lastId = id;
    } catch (e) {
      console.error('[getFeedReels] Cursor decoding failed:', e);
    }
  }

  // 1. Personalized Content (80%)
  const personalizedLimit = Math.ceil(limit * 0.8);
  const explorationLimit = limit - personalizedLimit;

  // Build query based on audience privacy
  let baseQuery = { isActive: true, status: 'completed' };
  if (!req.user) {
    baseQuery.audience = 'everyone';
  } else {
    const following = await Follow.find({ follower: req.user._id, status: 'accepted' }).select('following');
    const followingIds = following.map(f => f.following);
    const followers = await Follow.find({ following: req.user._id, status: 'accepted' }).select('follower');
    const followerIds = followers.map(f => f.follower);

    baseQuery.$and = [
      {
        $or: [
          { audience: 'everyone' },
          { user: req.user._id },
          { user: { $in: followingIds }, audience: 'followers' },
          { user: { $in: followerIds }, audience: 'following' }
        ]
      }
    ];
  }

  // Optimize: Retrieve a candidate pool of the 300 most recent active reels matching the privacy rules
  // This avoids a full collection scan during the complex scoring aggregation pipeline.
  const candidateReels = await Reel.find(baseQuery)
    .sort({ createdAt: -1 })
    .limit(300)
    .select('_id')
    .lean();

  const candidateIds = candidateReels.map(r => r._id);

  if (candidateIds.length === 0) {
    return res.status(200).json({
      success: true,
      reels: [],
      nextCursor: null,
      hasMore: false
    });
  }

  const queryWithCandidates = { _id: { $in: candidateIds } };

  // Generate Personalized Pipeline
  const personalizedPipeline = await RecommendationEngine.getRecommendationPipeline(
    req.user?._id, 
    { limit: personalizedLimit + 1, lastScore, lastId, query: queryWithCandidates, isExploration: false }
  );

  // Generate Exploration Pipeline (20%)
  const explorationPipeline = await RecommendationEngine.getRecommendationPipeline(
    req.user?._id,
    { limit: explorationLimit, query: queryWithCandidates, isExploration: true }
  );

  const [personalizedResults, explorationResults] = await Promise.all([
    Reel.aggregate(personalizedPipeline),
    Reel.aggregate(explorationPipeline)
  ]);

  // Combine and deduplicate
  const seenIds = new Set();
  const combinedResults = [];
  
  // Interleave results or just append exploration
  personalizedResults.slice(0, personalizedLimit).forEach(r => {
    combinedResults.push(r);
    seenIds.add(r._id.toString());
  });

  explorationResults.forEach(r => {
    if (!seenIds.has(r._id.toString())) {
      combinedResults.push(r);
      seenIds.add(r._id.toString());
    }
  });

  // Populate user data
  const reels = await Reel.populate(combinedResults.slice(0, limit), [
    { path: 'user', select: 'username fullName profilePicture isVerified downloadPrivacy' },
    { path: 'music.audioId' }
  ]);

  const hasMore = personalizedResults.length > personalizedLimit;
  let nextCursor = null;
  if (hasMore) {
    const lastReel = reels[reels.length - 1];
    nextCursor = Buffer.from(`${lastReel.finalScore}_${lastReel._id}`).toString('base64');
  }

  // Inject Ads and Like/Save status
  if (reels.length > 0) {
    const ads = await Ad.find({ isActive: true, status: 'approved' })
      .populate('user', 'username profilePicture isVerified')
      .lean();

    const activeUserAds = ads.filter(ad => ad.user);

    if (activeUserAds.length > 0) {
      const ad = activeUserAds[0];
      reels.splice(Math.floor(reels.length / 2), 0, {
        ...ad,
        _id: ad._id.toString(),
        isAd: true,
        video: { url: ad.media.url, type: ad.media.type, thumbnail: ad.media.thumbnail || ad.media.url },
        stats: {
          likesCount: ad.stats?.likesCount || 0,
          viewsCount: ad.stats?.viewsCount || 0,
          commentsCount: ad.stats?.commentsCount || 0,
          clicksCount: ad.stats?.clicksCount || 0
        }
      });
    }

    if (req.user) {
      const reelIds = reels.filter(r => !r.isAd).map(r => r._id);
      const adIds = reels.filter(r => r.isAd).map(r => r._id);
      
      const [likes, adLikes, saves] = await Promise.all([
        Like.find({ user: req.user._id, reel: { $in: reelIds } }),
        Like.find({ user: req.user._id, ad: { $in: adIds } }),
        SavedReel.find({ user: req.user._id, reel: { $in: reelIds } })
      ]);
      
      const likedSet = new Set([
        ...likes.map(l => l.reel.toString()), 
        ...adLikes.map(l => l.ad.toString())
      ]);
      const savedSet = new Set(saves.map(s => s.reel.toString()));

      reels.forEach(r => {
        r.isLiked = likedSet.has(r._id.toString());
        r.isSaved = savedSet.has(r._id.toString());
      });
    }
  }

  res.status(200).json({
    success: true,
    reels,
    nextCursor,
    hasMore
  });
});

/**
 * @desc    Get following reels
 * @route   GET /api/reels/following
 * @access  Private
 */
export const getFollowingReels = asyncHandler(async (req, res) => {
  // Global geo-targeting check
  const isAllowed = await isUserAllowedToViewReels(req);
  if (!isAllowed) {
    return res.status(200).json({
      success: true,
      reels: [],
      pagination: { pages: 0, page: 1, hasMore: false }
    });
  }

  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  const cursor = req.query.cursor; // last_id

  const following = await Follow.find({ follower: req.user._id, status: 'accepted' }).select('following');
  const followingIds = following.map(f => f.following);

  const followers = await Follow.find({ following: req.user._id, status: 'accepted' }).select('follower');
  const followerIds = followers.map(f => f.follower);

  let query = { 
    user: { $in: followingIds },
    isActive: true,
    status: 'completed',
    $or: [
      { audience: 'everyone' },
      { audience: 'followers' },
      { user: { $in: followerIds }, audience: 'following' }
    ]
  };

  if (cursor) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const reels = await Reel.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .populate('user', 'username fullName profilePicture isVerified downloadPrivacy')
    .populate('music.audioId')
    .lean();

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

  const hasMore = reels.length === limit;
  const nextCursor = hasMore ? reels[reels.length - 1]._id : null;

  res.status(200).json({
    success: true,
    reels,
    nextCursor,
    hasMore
  });
});

/**
 * @desc    Record watch time for a reel
 * @route   POST /api/reels/:id/watch-time
 * @access  Public
 */
export const recordWatchTime = asyncHandler(async (req, res) => {
  const { id: reelId } = req.params;
  const { duration } = req.body; // seconds watched

  if (!duration || isNaN(duration)) {
    return res.status(400).json({ success: false, message: 'Valid duration is required' });
  }

  await Reel.findByIdAndUpdate(reelId, {
    $inc: { 'stats.totalWatchTime': duration }
  });

  res.status(200).json({ success: true });
});

/**
 * @desc    Share a reel
 * @route   POST /api/reels/:id/share
 * @access  Private
 */
export const shareReel = asyncHandler(async (req, res) => {
  const { id: reelId } = req.params;

  // Increment share count
  await Reel.findByIdAndUpdate(reelId, {
    $inc: { 'stats.sharesCount': 1 }
  });

  // Update user interest profile if logged in
  if (req.user) {
    RecommendationEngine.updateUserInterests(req.user._id, reelId, 'share');
  }

  res.status(200).json({ success: true });
});

/**
 * @desc    Get trending reels
 * @route   GET /api/reels/trending
 * @access  Public
 */
export const getTrendingReels = asyncHandler(async (req, res) => {
  // Global geo-targeting check
  const isAllowed = await isUserAllowedToViewReels(req);
  if (!isAllowed) {
    return res.status(200).json({
      success: true,
      reels: [],
      pagination: { pages: 0, page: 1, hasMore: false }
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Optimize: Retrieve a candidate pool of the 300 most recent active public reels
  // This avoids a full collection scan for dynamic engagement calculations.
  const candidateReels = await Reel.find({ 
    isActive: true, 
    status: 'completed', 
    audience: 'everyone'
  })
    .sort({ createdAt: -1 })
    .limit(300)
    .select('_id')
    .lean();

  const candidateIds = candidateReels.map(r => r._id);

  if (candidateIds.length === 0) {
    return res.status(200).json({
      success: true,
      reels: [],
      page,
      limit
    });
  }

  // Trending algorithm: (EngagementVelocity * 0.6) + (WatchRetention * 0.4) - TimeDecay
  const pipeline = [
    { $match: { _id: { $in: candidateIds } } },
    {
      $addFields: {
        ageInHours: {
          $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000]
        },
        engagement: {
          $add: [
            { $multiply: [{ $ifNull: ["$stats.likesCount", 0] }, 2] },
            { $multiply: [{ $ifNull: ["$stats.commentsCount", 0] }, 3] },
            { $multiply: [{ $ifNull: ["$stats.sharesCount", 0] }, 5] }
          ]
        }
      }
    },
    {
      $addFields: {
        velocity: { $divide: ["$engagement", { $add: ["$ageInHours", 2] }] },
        retention: {
          $cond: [
            { $gt: ["$stats.viewsCount", 0] },
            { $multiply: [{ $divide: ["$stats.totalWatchTime", { $multiply: ["$stats.viewsCount", { $ifNull: ["$video.duration", 15] }] }] }, 100] },
            0
          ]
        }
      }
    },
    {
      $addFields: {
        trendingScore: {
          $divide: [
            { $add: [{ $multiply: ["$velocity", 0.6] }, { $multiply: ["$retention", 0.4] }] },
            { $pow: [{ $add: ["$ageInHours", 2] }, 1.8] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  const results = await Reel.aggregate(pipeline);
  const reels = await Reel.populate(results, [
    { path: 'user', select: 'username fullName profilePicture isVerified' },
    { path: 'music.audioId' }
  ]);

  // Add liked/saved status
  if (req.user && reels.length > 0) {
    const reelIds = reels.map(r => r._id);
    const [likes, saves] = await Promise.all([
      Like.find({ user: req.user._id, reel: { $in: reelIds } }),
      SavedReel.find({ user: req.user._id, reel: { $in: reelIds } })
    ]);
    
    const likedSet = new Set(likes.map(l => l.reel.toString()));
    const savedSet = new Set(saves.map(s => s.reel.toString()));

    reels.forEach(r => {
      r.isLiked = likedSet.has(r._id.toString());
      r.isSaved = savedSet.has(r._id.toString());
    });
  }

  res.status(200).json({
    success: true,
    reels,
    page,
    limit
  });
});

/**
 * @desc    Submit detailed reel analytics (watch behavior)
 * @route   POST /api/reels/:id/analytics
 * @access  Public (Tracked for logged in users)
 */
export const submitReelAnalytics = asyncHandler(async (req, res) => {
  const { id: reelId } = req.params;
  const { 
    watchDuration, 
    completionPercentage, 
    replayCount, 
    isFullWatch, 
    swipeTiming,
    deviceInfo 
  } = req.body;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // Record aggregate stats
  await Reel.findByIdAndUpdate(reelId, {
    $inc: { 
      'stats.totalWatchTime': watchDuration || 0,
      'stats.viewsCount': (watchDuration > 1) ? 1 : 0 
    }
  });

  // Record detailed analytics if user is logged in
  if (req.user) {
    await WatchAnalytics.create({
      user: req.user._id,
      reel: reelId,
      watchDuration,
      completionPercentage,
      replayCount,
      isFullWatch,
      swipeTiming,
      deviceInfo
    });

    // Update user interest profile
    await RecommendationEngine.updateUserInterests(req.user._id, reelId, 'watch', {
      watchDuration,
      completionPercentage,
      replayCount,
      isFullWatch
    });
  }

  res.status(200).json({ success: true });
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

  // Enforce audience privacy rules
  if (reel.audience && reel.audience !== 'everyone' && (!req.user || req.user._id.toString() !== reel.user._id.toString())) {
    let isFollowing = false;
    let isFollower = false;

    if (req.user) {
      const [follow, incoming] = await Promise.all([
        Follow.findOne({ follower: req.user._id, following: reel.user._id, status: 'accepted' }),
        Follow.findOne({ follower: reel.user._id, following: req.user._id, status: 'accepted' })
      ]);
      isFollowing = !!follow;
      isFollower = !!incoming;
    }

    if (reel.audience === 'followers' && !isFollowing) {
      return res.status(403).json({
        success: false,
        message: "This reel is only visible to the creator's followers"
      });
    }

    if (reel.audience === 'following' && !isFollower) {
      return res.status(403).json({
        success: false,
        message: "This reel is only visible to the creator's following"
      });
    }
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

  // Delete video from S3
  if (reel.video.publicId) {
    await deleteFromS3(reel.video.publicId);
  }

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

    // Update user interest profile
    if (req.user && !isAd) {
      RecommendationEngine.updateUserInterests(uId, cId, 'like');
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

    // Update interests for save action
    if (req.user && !isAd) {
      RecommendationEngine.updateUserInterests(userId, cId, 'save');
    }

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
  // Global geo-targeting check
  const isAllowed = await isUserAllowedToViewReels(req);
  if (!isAllowed) {
    return res.status(200).json({
      success: true,
      reels: [],
      pagination: { total: 0, pages: 0, page: 1, limit }
    });
  }

  const { q, hashtag } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = { 
    isActive: true,
    status: 'completed'
  };

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
 * @desc    Download reel directly (Stream file from storage to bypass CORS and force download)
 * @route   GET /api/reels/:id/download
 * @access  Public
 */
export const downloadReel = asyncHandler(async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  // Find the uploader user to check their download privacy setting
  const uploader = await User.findById(reel.user);
  if ((uploader?.downloadPrivacy === 'Off') || (reel.allowDownload === false)) {
    console.log(`[DOWNLOAD LOG - BLOCKED] Download blocked for Reel ID: ${reel._id}. Privacy: Off or allowDownload: false.`);
    return res.status(403).json({ success: false, message: 'Downloading this reel is disabled' });
  }

  const videoUrl = reel.video?.url || reel.rawVideoUrl;
  if (!videoUrl) {
    console.log(`[DOWNLOAD LOG - ERROR] Video URL not found for Reel ID: ${reel._id}`);
    return res.status(404).json({ success: false, message: 'Video URL not found' });
  }

  const filename = `jhumroo-reel-${reel._id}.mp4`;
  let s3DownloadUrl = null;

  console.log(`[DOWNLOAD LOG - INITIATED] Reel ID: ${reel._id} | Uploader: ${reel.user} | Requester: ${req.user ? req.user._id : 'Guest/Public'} | On S3: ${!!reel.video?.publicId}`);

  // Generate S3 presigned URL if publicId exists (meaning it's on S3)
  if (reel.video?.publicId) {
    try {
      s3DownloadUrl = await getPresignedDownloadUrl(reel.video.publicId, filename);
      console.log(`[DOWNLOAD LOG - S3 SUCCESS] Secure presigned download URL generated for Reel ID: ${reel._id}`);
    } catch (err) {
      console.error('[downloadReel] Error generating S3 presigned URL:', err);
    }
  }

  // If frontend requests JSON response containing the direct download url
  if (req.query.json === 'true') {
    console.log(`[DOWNLOAD LOG - JSON RESPONSE] Sending download URL for Reel ID: ${reel._id}`);
    return res.status(200).json({
      success: true,
      downloadUrl: s3DownloadUrl || videoUrl
    });
  }

  // Otherwise, fallback / traditional direct access:
  // If S3, redirect directly to S3 forced download URL
  if (s3DownloadUrl) {
    console.log(`[DOWNLOAD LOG - REDIRECT] Redirecting requester to S3 URL for Reel ID: ${reel._id}`);
    return res.redirect(s3DownloadUrl);
  }

  // If not on S3, stream it directly as proxy to bypass CORS
  try {
    console.log(`[DOWNLOAD LOG - STREAMING] Proxy streaming local/external file for Reel ID: ${reel._id}`);
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream'
    });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');

    response.data.pipe(res);
  } catch (error) {
    console.error('[downloadReel] Error streaming file:', error);
    // Fallback: redirect to direct URL if streaming fails
    res.redirect(videoUrl);
  }
});



