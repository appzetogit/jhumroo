import express from 'express';
import {
  getDashboardStats,
  getUserGrowth,
  getReelsGrowth,
  getNewUsersMonthly,
  getContentAnalytics,
  getWatchTimeAnalytics,
  getTopUsers,
  getTopReels,
  getReportsAnalytics,
  getAdminActivity,
  getPlatformHealth,
  exportAnalytics,
  getReelGeoAnalytics,
  getAdsAnalytics
} from '../controllers/analytics.controller.js';
import { protectAdmin, checkPermission, checkRole } from '../../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// Dashboard and overview
router.get('/dashboard', getDashboardStats);
router.get('/health', getPlatformHealth);

// User analytics
router.get('/user-growth', getUserGrowth);
router.get('/top-users', getTopUsers);

// Reels growth
router.get('/reels-growth', getReelsGrowth);
router.get('/new-users-monthly', getNewUsersMonthly);

// Content analytics
router.get('/content', getContentAnalytics);
router.get('/watch-time', getWatchTimeAnalytics);
router.get('/top-reels', getTopReels);

// Geo analytics for reels
router.get('/reel-geo', getReelGeoAnalytics);

// Ads analytics
router.get('/ads', getAdsAnalytics);

// Reports analytics
router.get('/reports', checkPermission('manage_reports'), getReportsAnalytics);

// Admin activity (super_admin only)
router.get('/admin-activity', checkRole('super_admin'), getAdminActivity);

// Export data
router.get('/export', checkPermission('manage_analytics'), exportAnalytics);

export default router;
