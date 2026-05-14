import express from 'express';
import {
  getUserProfile,
  updateProfile,
  uploadProfilePicture,
  getUserReels,
  getLikedReels,
  getSavedReels,
  searchUsers,
  getSuggestedUsers
} from '../controllers/user.controller.js';
import {
  getPreferences,
  updatePreferences,
  markInterested,
  markNotInterested
} from '../controllers/preference.controller.js';
import { protect, optionalAuth } from '../../../middleware/auth.js';
import { uploadImage, handleMulterError } from '../../../middleware/upload.js';
import { profileUpdateValidation, validate } from '../../../middleware/validation.js';

const router = express.Router();

// Public routes with optional auth
router.get('/search', optionalAuth, searchUsers);
router.get('/suggested', optionalAuth, getSuggestedUsers);
router.get('/:username', optionalAuth, getUserProfile);
router.get('/:username/reels', optionalAuth, getUserReels);

// Protected routes
router.put('/profile', protect, profileUpdateValidation, validate, updateProfile);
router.post('/profile-picture', protect, uploadImage, handleMulterError, uploadProfilePicture);
router.get('/me/liked-reels', protect, getLikedReels);
router.get('/me/saved-reels', protect, getSavedReels);

// Preference routes
router.get('/me/preferences', protect, getPreferences);
router.put('/me/preferences', protect, updatePreferences);
router.post('/me/preferences/interested', protect, markInterested);
router.post('/me/preferences/not-interested', protect, markNotInterested);

export default router;
