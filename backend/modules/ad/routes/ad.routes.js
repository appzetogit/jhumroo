import express from 'express';
import { 
  createAd, 
  getMyAds, 
  toggleAdStatus, 
  deleteAd, 
  getAdsForFeed,
  getAdAnalytics,
  getAllAds,
  trackView,
  trackClick,
  updateAd,
  getUserAds,
  reviewAd
} from '../controllers/ad.controller.js';
import { protect } from '../../../middleware/auth.js';
import { uploadAdMedia, uploadAdWithMusic } from '../../../middleware/upload.js';

const router = express.Router();

// Static routes MUST come before parameterized /:id routes
router.post('/', protect, uploadAdWithMusic, createAd);
router.get('/me', protect, getMyAds);
router.get('/feed', protect, getAdsForFeed);
router.get('/admin/all', protect, getAllAds);
router.get('/admin/user-ads', protect, getUserAds);

// Parameterized routes
router.get('/:id/analytics', protect, getAdAnalytics);
router.put('/:id', protect, uploadAdWithMusic, updateAd);
router.patch('/:id/toggle', protect, toggleAdStatus);
router.patch('/:id/review', protect, reviewAd);
router.delete('/:id', protect, deleteAd);
router.post('/:id/view', trackView);
router.post('/:id/click', trackClick);
router.get('/:id', protect, getAdAnalytics);

export default router;
