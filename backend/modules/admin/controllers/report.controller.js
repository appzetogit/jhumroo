import Report from '../../../models/Report.model.js';
import Reel from '../../../models/Reel.model.js';
import User from '../../../models/User.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get all reports with populated data
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
export const getReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const { type } = req.query;

  const query = {};
  if (type && ['Reel', 'User', 'Comment'].includes(type)) {
    query.reportType = type;
  }

  const reports = await Report.find(query)
    .populate('reportedBy', 'username fullName profilePicture')
    .populate({
      path: 'reportedItem',
      populate: {
        path: 'user',
        select: 'username fullName profilePicture isBanned',
        options: { strictPopulate: false }
      },
      options: { strictPopulate: false }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Report.countDocuments(query);

  res.status(200).json({
    success: true,
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Resolve or dismiss a report
 * @route   PUT /api/admin/reports/:id
 * @access  Private (Admin)
 */
export const updateReportStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes, actionTaken } = req.body;

  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  report.status = status || report.status;
  report.adminNotes = adminNotes || report.adminNotes;
  report.actionTaken = actionTaken || report.actionTaken;
  report.reviewedBy = req.admin._id;
  report.reviewedAt = new Date();

  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report updated successfully',
    report
  });
});

/**
 * @desc    Remove reel from feed (set isActive to false)
 * @route   POST /api/admin/reports/remove-reel/:reelId
 * @access  Private (Admin)
 */
export const removeReelFromFeed = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const { reportId } = req.body;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    return res.status(404).json({ success: false, message: 'Reel not found' });
  }

  reel.isActive = false;
  await reel.save();

  // If reportId is provided, update report status
  if (reportId) {
    await Report.findByIdAndUpdate(reportId, {
      status: 'resolved',
      actionTaken: 'content_removed',
      reviewedBy: req.admin._id,
      reviewedAt: new Date(),
      adminNotes: 'Reel removed from feed by admin'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Reel removed from feed successfully'
  });
});

/**
 * @desc    Ban user
 * @route   POST /api/admin/reports/ban-user/:userId
 * @access  Private (Admin)
 */
export const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reportId, reason } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.isBanned = true;
  user.banReason = reason || 'Violation of community guidelines';
  await user.save();

  // If reportId is provided, update report status
  if (reportId) {
    await Report.findByIdAndUpdate(reportId, {
      status: 'resolved',
      actionTaken: 'user_banned',
      reviewedBy: req.admin._id,
      reviewedAt: new Date(),
      adminNotes: `User banned by admin. Reason: ${reason}`
    });
  }

  res.status(200).json({
    success: true,
    message: 'User banned successfully'
  });
});
