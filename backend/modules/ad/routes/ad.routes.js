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
  getUserAds
} from '../controllers/ad.controller.js';
import { protect } from '../../../middleware/auth.js';
import { uploadAdMedia, uploadAdWithMusic } from '../../../middleware/upload.js';

const router = express.Router();

router.post('/', protect, uploadAdWithMusic, createAd);
router.get('/me', protect, getMyAds);
router.get('/admin/all', protect, getAllAds);
router.get('/admin/user-ads', protect, getUserAds);
router.get('/:id', protect, getAdAnalytics);
router.get('/:id/analytics', protect, getAdAnalytics);
router.put('/:id', protect, uploadAdWithMusic, updateAd);
router.patch('/:id/toggle', protect, toggleAdStatus);
router.delete('/:id', protect, deleteAd);
router.get('/feed', protect, getAdsForFeed);
router.post('/:id/view', trackView);
router.post('/:id/click', trackClick);

export default router;
