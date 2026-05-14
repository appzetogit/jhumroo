import express from 'express';
import {
  createReel,
  createUploadUrl,
  completeUpload,
  getFeedReels,
  getFollowingReels,
  getReel,
  deleteReel,
  toggleLike,
  toggleSave,
  addView,
  searchReels,
  reportReel,
  editReel,
  getSavedCollections,
  getTrendingReels,
  shareReel
} from '../controllers/reel.controller.js';
import { protect, optionalAuth } from '../../../middleware/auth.js';
import { uploadVideo, handleMulterError, uploadThumbnail } from '../../../middleware/upload.js';
import { reelCreateValidation, validate } from '../../../middleware/validation.js';
import { uploadRateLimiter } from '../../../middleware/rateLimiter.js';

const router = express.Router();

// Public routes with optional auth
router.get('/feed', optionalAuth, getFeedReels);
router.get('/trending', optionalAuth, getTrendingReels);
router.get('/search', optionalAuth, searchReels);
router.get('/:id', optionalAuth, getReel);
router.post('/:id/view', optionalAuth, addView);
router.post('/:id/share', optionalAuth, shareReel);

// Protected routes
router.post('/', protect, uploadRateLimiter, uploadVideo, handleMulterError, reelCreateValidation, validate, createReel);
router.post('/create-upload-url', protect, createUploadUrl);
router.post('/complete-upload', protect, completeUpload);
router.get('/following/feed', protect, getFollowingReels);
router.delete('/:id', protect, deleteReel);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/save', protect, toggleSave);
router.get('/saved/collections', protect, getSavedCollections);
router.post('/:id/report', protect, reportReel);
router.put('/:id', protect, uploadThumbnail, handleMulterError, editReel);

export default router;
