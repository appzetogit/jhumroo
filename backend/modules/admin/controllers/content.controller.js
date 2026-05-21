import Reel from '../../../models/Reel.model.js';
import Comment from '../../../models/Comment.model.js';
import Report from '../../../models/Report.model.js';
import User from '../../../models/User.model.js';
import Like from '../../../models/Like.model.js';
import SystemSetting from '../../../models/SystemSetting.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { deleteFile } from '../../../config/cloudinary.js';

/**
 * @desc    Get all reels with filters and pagination
 * @route   GET /api/admin/content/reels
 * @access  Private/Admin
 */
export const getAllReels = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    reported = false,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};

  // Search by caption or hashtags
  if (search) {
    query.$or = [
      { caption: { $regex: search, $options: 'i' } },
      { hashtags: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter reported content
  if (reported === 'true') {
    const reportedReelIds = await Report.distinct('reportedItem', {
      reportType: 'Reel',
      status: { $in: ['pending', 'under_review'] }
    });
    query._id = { $in: reportedReelIds };
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reels = await Reel.find(query)
    .populate('user', 'username fullName profilePicture isVerified')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Reel.countDocuments(query);

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
 * @desc    Get reel details by ID
 * @route   GET /api/admin/content/reels/:id
 * @access  Private/Admin
 */
export const getReelById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reel = await Reel.findById(id)
    .populate('user', 'username fullName profilePicture isVerified');

  if (!reel) {
    return res.status(404).json({
      success: false,
      message: 'Reel not found'
    });
  }

  // Get additional stats
  const [likesCount, commentsCount, reports] = await Promise.all([
    Like.countDocuments({ reel: reel._id }),
    Comment.countDocuments({ reel: reel._id }),
    Report.find({ reportType: 'Reel', reportedItem: reel._id })
      .populate('reportedBy', 'username fullName')
      .sort({ createdAt: -1 })
  ]);

  res.status(200).json({
    success: true,
    reel,
    stats: {
      likesCount,
      commentsCount,
      reportsCount: reports.length
    },
    reports
  });
});

/**
 * @desc    Delete reel
 * @route   DELETE /api/admin/content/reels/:id
 * @access  Private/Admin (require permission: delete_content)
 */
export const deleteReel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const reel = await Reel.findById(id);

  if (!reel) {
    return res.status(404).json({
      success: false,
      message: 'Reel not found'
    });
  }

  // Delete video from cloudinary
  if (reel.video?.publicId) {
    try {
      await deleteFile(reel.video.publicId, 'video');
    } catch (error) {
      console.error('Error deleting video from Cloudinary:', error);
    }
  }

  // Delete thumbnail if exists
  if (reel.thumbnail?.publicId) {
    try {
      await deleteFile(reel.thumbnail.publicId);
    } catch (error) {
      console.error('Error deleting thumbnail from Cloudinary:', error);
    }
  }

  // Delete associated data
  await Promise.all([
    Like.deleteMany({ reel: reel._id }),
    Comment.deleteMany({ reel: reel._id }),
    Report.updateMany(
      { reportType: 'Reel', reportedItem: reel._id },
      { status: 'resolved', actionTaken: 'content_removed' }
    )
  ]);

  await reel.deleteOne();

  // Log activity
  req.admin.addActivity(
    'reel_deleted',
    `Deleted reel ID: ${id}. Reason: ${reason || 'Not specified'}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Reel deleted successfully'
  });
});

/**
 * @desc    Get all comments with filters
 * @route   GET /api/admin/content/comments
 * @access  Private/Admin
 */
export const getAllComments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    reported = false,
    reelId
  } = req.query;

  const query = {};

  if (search) {
    query.text = { $regex: search, $options: 'i' };
  }

  if (reelId) {
    query.reel = reelId;
  }

  if (reported === 'true') {
    const reportedCommentIds = await Report.distinct('reportedItem', {
      reportType: 'Comment',
      status: { $in: ['pending', 'under_review'] }
    });
    query._id = { $in: reportedCommentIds };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const comments = await Comment.find(query)
    .populate('user', 'username fullName profilePicture')
    .populate('reel', 'caption')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Comment.countDocuments(query);

  res.status(200).json({
    success: true,
    count: comments.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    comments
  });
});

/**
 * @desc    Delete comment
 * @route   DELETE /api/admin/content/comments/:id
 * @access  Private/Admin (require permission: delete_content)
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Update reports
  await Report.updateMany(
    { reportType: 'Comment', reportedItem: comment._id },
    { status: 'resolved', actionTaken: 'content_removed' }
  );

  await comment.deleteOne();

  // Log activity
  req.admin.addActivity(
    'comment_deleted',
    `Deleted comment ID: ${id}. Reason: ${reason || 'Not specified'}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully'
  });
});

/**
 * @desc    Sync durations for all reels (Fix missing metadata)
 * @route   POST /api/admin/content/reels/sync-durations
 * @access  Private/Admin
 */
import ffmpeg from 'fluent-ffmpeg';
export const syncAllDurations = asyncHandler(async (req, res) => {
  const reels = await Reel.find({ 
    $or: [
      { 'video.duration': 0 }, 
      { 'video.duration': { $exists: false } },
      { 'video.duration': null }
    ] 
  });
  
  console.log(`[Admin] Syncing durations for ${reels.length} reels`);
  let updatedCount = 0;
  const results = [];
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;

  for (const reel of reels) {
    try {
      let videoUrl = reel.video?.url;
      
      // If it's a relative path or S3 key, construct full URL
      if (videoUrl && !videoUrl.startsWith('http')) {
        if (cdnDomain) {
          videoUrl = `https://${cdnDomain}/${reel.video.publicId}`;
        }
      }

      let duration = 0;
      if (videoUrl) {
        duration = await new Promise((resolve) => {
          ffmpeg.ffprobe(videoUrl, (err, metadata) => {
            if (err) resolve(0);
            else resolve(metadata.format.duration || 0);
          });
        });
      }

      // Fallback to music duration if video duration is still 0
      if (!duration || duration === 0) {
        duration = reel.music?.duration || 0;
      }

      if (duration > 0) {
        await Reel.updateOne(
          { _id: reel._id },
          { $set: { 'video.duration': Math.round(duration) } }
        );
        updatedCount++;
        results.push({ id: reel._id, duration: Math.round(duration) });
      }
    } catch (err) {
      console.error(`Failed to sync duration for reel ${reel._id}:`, err.message);
    }
  }

  res.status(200).json({
    success: true,
    message: `Successfully updated durations for ${updatedCount} reels`,
    results
  });
});

/**
 * @desc    Get all reports with filters
 * @route   GET /api/admin/content/reports
 * @access  Private/Admin
 */
export const getAllReports = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = 'pending',
    reportType,
    priority,
    reason
  } = req.query;

  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (reportType) {
    query.reportType = reportType;
  }

  if (priority) {
    query.priority = priority;
  }

  if (reason) {
    query.reason = reason;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reports = await Report.find(query)
    .populate('reportedBy', 'username fullName profilePicture')
    .populate('reviewedBy', 'fullName email')
    .populate({
      path: 'reportedItem',
      select: 'username fullName caption text'
    })
    .sort({ priority: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Report.countDocuments(query);

  // Get counts by status
  const [pendingCount, underReviewCount, resolvedCount, dismissedCount] = await Promise.all([
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'under_review' }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'dismissed' })
  ]);

  res.status(200).json({
    success: true,
    count: reports.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    reports,
    statusCounts: {
      pending: pendingCount,
      underReview: underReviewCount,
      resolved: resolvedCount,
      dismissed: dismissedCount
    }
  });
});

/**
 * @desc    Get report details
 * @route   GET /api/admin/content/reports/:id
 * @access  Private/Admin
 */
export const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await Report.findById(id)
    .populate('reportedBy', 'username fullName profilePicture email phoneNumber')
    .populate('reviewedBy', 'fullName email')
    .populate({
      path: 'reportedItem'
    });

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }

  res.status(200).json({
    success: true,
    report
  });
});

/**
 * @desc    Update report status
 * @route   PUT /api/admin/content/reports/:id
 * @access  Private/Admin (require permission: manage_reports)
 */
export const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, actionTaken, adminNotes, priority } = req.body;

  const report = await Report.findById(id);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }

  // Update fields
  if (status) {
    report.status = status;
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();
  }

  if (actionTaken) report.actionTaken = actionTaken;
  if (adminNotes) report.adminNotes = adminNotes;
  if (priority) report.priority = priority;

  await report.save();

  // Log activity
  req.admin.addActivity(
    'report_updated',
    `Updated report ID: ${id}. Status: ${status}, Action: ${actionTaken}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Report updated successfully',
    report
  });
});

/**
 * @desc    Bulk resolve reports
 * @route   POST /api/admin/content/reports/bulk-resolve
 * @access  Private/Admin (require permission: manage_reports)
 */
export const bulkResolveReports = asyncHandler(async (req, res) => {
  const { reportIds, actionTaken, adminNotes } = req.body;

  if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide valid report IDs'
    });
  }

  const result = await Report.updateMany(
    { _id: { $in: reportIds } },
    {
      status: 'resolved',
      actionTaken: actionTaken || 'none',
      adminNotes: adminNotes || '',
      reviewedBy: req.admin._id,
      reviewedAt: new Date()
    }
  );

  // Log activity
  req.admin.addActivity(
    'bulk_resolve_reports',
    `Bulk resolved ${reportIds.length} reports`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Reports resolved successfully',
    affectedCount: result.modifiedCount
  });
});

/**
 * @desc    Get content statistics
 * @route   GET /api/admin/content/stats
 * @access  Private/Admin
 */
export const getContentStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const [
    totalReels,
    totalComments,
    recentReels,
    recentComments,
    pendingReports,
    resolvedReports
  ] = await Promise.all([
    Reel.countDocuments(),
    Comment.countDocuments(),
    Reel.countDocuments({ createdAt: { $gte: startDate } }),
    Comment.countDocuments({ createdAt: { $gte: startDate } }),
    Report.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
    Report.countDocuments({ 
      status: 'resolved',
      reviewedAt: { $gte: startDate }
    })
  ]);

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    stats: {
      totalReels,
      totalComments,
      recentReels,
      recentComments,
      pendingReports,
      resolvedReports
    }
  });
});

/**
 * @desc    Get all unique sounds from reels
 * @route   GET /api/admin/content/sounds
 * @access  Private/Admin
 */
export const getAllSounds = asyncHandler(async (req, res) => {
  const sounds = await Reel.aggregate([
    {
      $group: {
        _id: "$music.name",
        name: { $first: "$music.name" },
        url: { $first: "$music.url" },
        artist: { $first: "$music.artist" },
        usageCount: { $sum: 1 }
      }
    },
    { $sort: { usageCount: -1 } }
  ]);

  res.status(200).json({
    success: true,
    count: sounds.length,
    sounds
  });
});

/**
 * @desc    Get all unique hashtags from reels
 * @route   GET /api/admin/content/hashtags
 * @access  Private/Admin
 */
export const getAllHashtags = asyncHandler(async (req, res) => {
  const hashtags = await Reel.aggregate([
    { $unwind: "$hashtags" },
    {
      $group: {
        _id: "$hashtags",
        name: { $first: "$hashtags" },
        usageCount: { $sum: 1 }
      }
    },
    { $sort: { usageCount: -1 } }
  ]);

  res.status(200).json({
    success: true,
    count: hashtags.length,
    hashtags
  });
});

/**
 * @desc    Get all users currently live
 * @route   GET /api/admin/content/live
 * @access  Private/Admin
 */
export const getAllLiveUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isLive: true })
    .select('username fullName profilePicture isLive lastActive stats')
    .sort({ lastActive: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users
  });
});

/**
 * @desc    Update reel geo-targeting
 * @route   PUT /api/admin/content/reels/:id/targeting
 * @access  Private/Admin (require permission: manage_content)
 */
export const updateReelTargeting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetLocations } = req.body;

  const reel = await Reel.findById(id);

  if (!reel) {
    return res.status(404).json({
      success: false,
      message: 'Reel not found'
    });
  }

  reel.targetLocations = targetLocations || [];
  await reel.save();

  // Log activity
  req.admin.addActivity(
    'reel_targeting_updated',
    `Updated geo-targeting for reel ID: ${id}`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Reel geo-targeting updated successfully',
    reel
  });
});

/**
 * @desc    Get global reel geo-targeting settings
 * @route   GET /api/admin/content/reels/global-targeting
 * @access  Private/Admin (require permission: manage_content)
 */
export const getGlobalReelsTargeting = asyncHandler(async (req, res) => {
  const setting = await SystemSetting.findOne({ key: 'global_reels_targeting' });
  res.status(200).json({
    success: true,
    targetLocations: setting ? setting.value : []
  });
});

/**
 * @desc    Update global reel geo-targeting settings
 * @route   PUT /api/admin/content/reels/global-targeting
 * @access  Private/Admin (require permission: manage_content)
 */
export const updateGlobalReelsTargeting = asyncHandler(async (req, res) => {
  const { targetLocations } = req.body;

  let setting = await SystemSetting.findOne({ key: 'global_reels_targeting' });
  if (!setting) {
    setting = new SystemSetting({
      key: 'global_reels_targeting',
      value: targetLocations || []
    });
  } else {
    setting.value = targetLocations || [];
  }
  await setting.save();

  // Log activity
  req.admin.addActivity(
    'global_reel_targeting_updated',
    `Updated global geo-targeting rules`,
    req.ip
  );
  await req.admin.save();

  res.status(200).json({
    success: true,
    message: 'Global reel geo-targeting updated successfully',
    targetLocations: setting.value
  });
});
