import User from '../../../models/User.model.js';
import Reel from '../../../models/Reel.model.js';
import Comment from '../../../models/Comment.model.js';
import Like from '../../../models/Like.model.js';
import Follow from '../../../models/Follow.model.js';
import Report from '../../../models/Report.model.js';
import Admin from '../../../models/Admin.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get dashboard overview statistics
 * @route   GET /api/admin/analytics/dashboard
 * @access  Private/Admin
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  // Get today's start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get total counts
  const [
    totalUsers,
    totalReels,
    totalComments,
    totalLikes,
    totalReports,
    activeUsers24h,
    liveUsers,
    bannedUsers
  ] = await Promise.all([
    User.countDocuments(),
    Reel.countDocuments(),
    Comment.countDocuments(),
    Like.countDocuments(),
    Report.countDocuments(),
    User.countDocuments({ lastActive: { $gte: last24h } }),
    User.countDocuments({ isLive: true }),
    User.countDocuments({ isBanned: true })
  ]);

  // Get today's stats
  const [
    newUsersToday,
    newReelsToday,
    newCommentsToday,
    newReportsToday
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    Reel.countDocuments({ createdAt: { $gte: todayStart } }),
    Comment.countDocuments({ createdAt: { $gte: todayStart } }),
    Report.countDocuments({ createdAt: { $gte: todayStart } })
  ]);

  // Get pending reports
  const [criticalReports, highReports, mediumReports, lowReports] = await Promise.all([
    Report.countDocuments({ status: { $in: ['pending', 'under_review'] }, priority: 'critical' }),
    Report.countDocuments({ status: { $in: ['pending', 'under_review'] }, priority: 'high' }),
    Report.countDocuments({ status: { $in: ['pending', 'under_review'] }, priority: 'medium' }),
    Report.countDocuments({ status: { $in: ['pending', 'under_review'] }, priority: 'low' })
  ]);

  // Get trending hashtags (top 5)
  const trendingHashtags = await Reel.aggregate([
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // Get watch time estimate (total views * avg duration if we don't track per-view duration)
  // Let's assume average reel duration is 15s if not specified, or use the actual duration
  const watchTimeData = await Reel.aggregate([
    {
      $group: {
        _id: null,
        totalWatchTime: { $sum: { $multiply: ['$stats.viewsCount', '$video.duration'] } }
      }
    }
  ]);

  const totalWatchTimeSeconds = watchTimeData.length > 0 ? watchTimeData[0].totalWatchTime : 0;

  res.status(200).json({
    success: true,
    stats: {
      overview: {
        totalUsers,
        totalReels,
        totalComments,
        totalLikes,
        totalReports,
        activeUsers24h,
        liveUsers,
        bannedUsers,
        totalWatchTimeSeconds
      },
      today: {
        newUsers: newUsersToday,
        newReels: newReelsToday,
        newComments: newCommentsToday,
        newReports: newReportsToday
      },
      pendingReports: {
        critical: criticalReports,
        high: highReports,
        medium: mediumReports,
        low: lowReports,
        total: criticalReports + highReports + mediumReports + lowReports
      },
      trendingHashtags: trendingHashtags.map(h => ({ tag: h._id, count: h.count }))
    }
  });
});

/**
 * @desc    Get user growth analytics
 * @route   GET /api/admin/analytics/user-growth
 * @access  Private/Admin
 */
export const getUserGrowth = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Aggregate users by day
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Get cumulative total
  let cumulative = await User.countDocuments({ createdAt: { $lt: startDate } });
  const growthData = userGrowth.map(item => {
    cumulative += item.count;
    return {
      date: item._id,
      newUsers: item.count,
      totalUsers: cumulative
    };
  });

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    data: growthData
  });
});

/**
 * @desc    Get content analytics
 * @route   GET /api/admin/analytics/content
 * @access  Private/Admin
 */
export const getContentAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get daily content stats
  const [reelsData, commentsData, likesData] = await Promise.all([
    Reel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Comment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Like.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    data: {
      reels: reelsData,
      comments: commentsData,
      likes: likesData
    }
  });
});

/**
 * @desc    Get watch time analytics
 * @route   GET /api/admin/analytics/watch-time
 * @access  Private/Admin
 */
export const getWatchTimeAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get daily watch time stats
  const watchTimeData = await Reel.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dailyWatchTime: { $sum: { $multiply: ['$stats.viewsCount', '$video.duration'] } },
        totalViews: { $sum: '$stats.viewsCount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    data: watchTimeData
  });
});

/**
 * @desc    Get top users by engagement
 * @route   GET /api/admin/analytics/top-users
 * @access  Private/Admin
 */
export const getTopUsers = asyncHandler(async (req, res) => {
  const { metric = 'followers', limit = 10 } = req.query;

  let users;

  switch (metric) {
    case 'followers':
      users = await User.find()
        .select('username fullName profilePicture stats.followersCount isVerified')
        .sort({ 'stats.followersCount': -1 })
        .limit(parseInt(limit));
      break;

    case 'reels':
      users = await User.find()
        .select('username fullName profilePicture isVerified')
        .sort({ 'stats.reelsCount': -1 })
        .limit(parseInt(limit));
      break;

    case 'likes':
      users = await User.find()
        .select('username fullName profilePicture stats.likesCount isVerified')
        .sort({ 'stats.likesCount': -1 })
        .limit(parseInt(limit));
      break;

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid metric. Use: followers, reels, or likes'
      });
  }

  res.status(200).json({
    success: true,
    metric,
    users
  });
});

/**
 * @desc    Get top reels by engagement
 * @route   GET /api/admin/analytics/top-reels
 * @access  Private/Admin
 */
export const getTopReels = asyncHandler(async (req, res) => {
  const { metric = 'likes', limit = 10, days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const query = { createdAt: { $gte: startDate } };

  let reels;

  switch (metric) {
    case 'likes':
      reels = await Reel.find(query)
        .populate('user', 'username fullName profilePicture isVerified')
        .sort({ 'stats.likesCount': -1 })
        .limit(parseInt(limit));
      break;

    case 'comments':
      reels = await Reel.find(query)
        .populate('user', 'username fullName profilePicture isVerified')
        .sort({ 'stats.commentsCount': -1 })
        .limit(parseInt(limit));
      break;

    case 'views':
      reels = await Reel.find(query)
        .populate('user', 'username fullName profilePicture isVerified')
        .sort({ 'stats.viewsCount': -1 })
        .limit(parseInt(limit));
      break;

    case 'shares':
      reels = await Reel.find(query)
        .populate('user', 'username fullName profilePicture isVerified')
        .sort({ 'stats.sharesCount': -1 })
        .limit(parseInt(limit));
      break;

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid metric. Use: likes, comments, views, or shares'
      });
  }

  res.status(200).json({
    success: true,
    metric,
    period: `Last ${days} days`,
    reels
  });
});

/**
 * @desc    Get reports analytics
 * @route   GET /api/admin/analytics/reports
 * @access  Private/Admin
 */
export const getReportsAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Reports by reason
  const reportsByReason = await Report.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Reports by type
  const reportsByType = await Report.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$reportType',
        count: { $sum: 1 }
      }
    }
  ]);

  // Reports by status
  const reportsByStatus = await Report.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Daily reports trend
  const dailyReports = await Report.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Average resolution time (in hours)
  const resolvedReports = await Report.find({
    status: 'resolved',
    reviewedAt: { $gte: startDate },
    reviewedAt: { $ne: null }
  });

  let totalResolutionTime = 0;
  resolvedReports.forEach(report => {
    const resolutionTime = (report.reviewedAt - report.createdAt) / (1000 * 60 * 60); // hours
    totalResolutionTime += resolutionTime;
  });

  const avgResolutionTime = resolvedReports.length > 0
    ? (totalResolutionTime / resolvedReports.length).toFixed(2)
    : 0;

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    data: {
      byReason: reportsByReason,
      byType: reportsByType,
      byStatus: reportsByStatus,
      dailyTrend: dailyReports,
      avgResolutionTimeHours: parseFloat(avgResolutionTime)
    }
  });
});

/**
 * @desc    Get admin activity analytics
 * @route   GET /api/admin/analytics/admin-activity
 * @access  Private/Admin (super_admin only)
 */
export const getAdminActivity = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get all admins with recent activity
  const admins = await Admin.find({
    'activityLog.timestamp': { $gte: startDate }
  }).select('fullName email role activityLog');

  const activityData = admins.map(admin => {
    const recentActivities = admin.activityLog.filter(
      log => log.timestamp >= startDate
    );

    // Group by action type
    const actionCounts = {};
    recentActivities.forEach(activity => {
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;
    });

    return {
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role
      },
      totalActions: recentActivities.length,
      actionBreakdown: actionCounts,
      lastActivity: recentActivities[recentActivities.length - 1]?.timestamp
    };
  });

  // Sort by total actions
  activityData.sort((a, b) => b.totalActions - a.totalActions);

  res.status(200).json({
    success: true,
    period: `Last ${days} days`,
    data: activityData
  });
});

/**
 * @desc    Get platform health metrics
 * @route   GET /api/admin/analytics/health
 * @access  Private/Admin
 */
export const getPlatformHealth = asyncHandler(async (req, res) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeUsers24h,
    newUsers24h,
    newUsers7d,
    avgReelsPerUser,
    engagementRate,
    reportRate
  ] = await Promise.all([
    User.countDocuments({ lastActive: { $gte: last24h } }),
    User.countDocuments({ createdAt: { $gte: last24h } }),
    User.countDocuments({ createdAt: { $gte: last7d } }),
    Reel.countDocuments().then(async reelsCount => {
      const usersCount = await User.countDocuments();
      return usersCount > 0 ? (reelsCount / usersCount).toFixed(2) : 0;
    }),
    Like.countDocuments({ createdAt: { $gte: last7d } }).then(async likesCount => {
      const reelsCount = await Reel.countDocuments({ createdAt: { $gte: last7d } });
      return reelsCount > 0 ? ((likesCount / reelsCount) * 100).toFixed(2) : 0;
    }),
    Report.countDocuments({ createdAt: { $gte: last7d } }).then(async reportsCount => {
      const contentCount = await Reel.countDocuments({ createdAt: { $gte: last7d } });
      return contentCount > 0 ? ((reportsCount / contentCount) * 100).toFixed(2) : 0;
    })
  ]);

  res.status(200).json({
    success: true,
    health: {
      activeUsers24h,
      newUsers24h,
      newUsers7d,
      avgReelsPerUser: parseFloat(avgReelsPerUser),
      engagementRatePercent: parseFloat(engagementRate),
      reportRatePercent: parseFloat(reportRate)
    },
    status: {
      userGrowth: newUsers7d > 0 ? 'healthy' : 'low',
      engagement: engagementRate > 10 ? 'healthy' : engagementRate > 5 ? 'moderate' : 'low',
      contentModeration: reportRate < 5 ? 'healthy' : reportRate < 10 ? 'moderate' : 'high'
    }
  });
});

/**
 * @desc    Export analytics data
 * @route   GET /api/admin/analytics/export
 * @access  Private/Admin
 */
export const exportAnalytics = asyncHandler(async (req, res) => {
  const { type = 'users', format = 'json' } = req.query;

  let data;

  switch (type) {
    case 'users':
      data = await User.find()
        .select('username fullName email phoneNumber createdAt stats isVerified')
        .lean();
      break;

    case 'reels':
      data = await Reel.find()
        .populate('user', 'username fullName')
        .select('caption createdAt stats')
        .lean();
      break;

    case 'reports':
      data = await Report.find()
        .populate('reportedBy', 'username')
        .select('reportType reason status createdAt reviewedAt actionTaken')
        .lean();
      break;

    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid export type'
      });
  }

  // Log activity
  req.admin.addActivity(
    'data_export',
    `Exported ${type} data in ${format} format`,
    req.ip
  );
  await req.admin.save();

  if (format === 'csv') {
    // Convert to CSV (basic implementation)
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-export-${Date.now()}.csv`);
    
    // Simplified CSV generation
    const csv = data.map(item => Object.values(item).join(',')).join('\n');
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    type,
    count: data.length,
    data
  });
});
