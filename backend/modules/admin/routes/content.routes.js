import express from 'express';
import {
  getAllReels,
  getReelById,
  deleteReel,
  getAllComments,
  deleteComment,
  getAllReports,
  getReportById,
  updateReport,
  bulkResolveReports,
  getContentStats,
  getAllSounds,
  getAllHashtags,
  getAllLiveUsers,
  syncAllDurations
} from '../controllers/content.controller.js';
import { protectAdmin, checkPermission } from '../../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// Reels management
router.get('/reels', getAllReels);
router.get('/reels/:id', getReelById);
router.delete('/reels/:id', checkPermission('delete_content'), deleteReel);
router.post('/reels/sync-durations', syncAllDurations);

// Comments management
router.get('/comments', getAllComments);
router.delete('/comments/:id', checkPermission('delete_content'), deleteComment);

// Reports management
router.get('/reports', checkPermission('manage_reports'), getAllReports);
router.get('/reports/:id', checkPermission('manage_reports'), getReportById);
router.put('/reports/:id', checkPermission('manage_reports'), updateReport);
router.post('/reports/bulk-resolve', checkPermission('manage_reports'), bulkResolveReports);

// Sounds management
router.get('/sounds', getAllSounds);

// Hashtags management
router.get('/hashtags', getAllHashtags);

// Live management
router.get('/live', getAllLiveUsers);

// Content statistics
router.get('/stats', getContentStats);

export default router;
