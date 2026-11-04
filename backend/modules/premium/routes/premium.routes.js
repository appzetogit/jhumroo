import express from 'express';
import {
  getPlanDetails,
  createPremiumOrder,
  verifyPremiumPayment,
  getPricingAdmin,
  updatePricingAdmin,
  getPremiumUsersAdmin,
  deleteSubscriptionAdmin
} from '../controllers/premium.controller.js';
import { protect, optionalAuth } from '../../../middleware/auth.js';
import { protectAdmin, checkPermission } from '../../../middleware/adminAuth.js';

const router = express.Router();

// User & Public endpoints
router.get('/plan', optionalAuth, getPlanDetails);
router.post('/create-order', protect, createPremiumOrder);
router.post('/verify-payment', protect, verifyPremiumPayment);

// Admin endpoints
router.get('/admin/pricing', protectAdmin, getPricingAdmin);
router.put('/admin/pricing', protectAdmin, checkPermission('manage_settings'), updatePricingAdmin);
router.get('/admin/users', protectAdmin, getPremiumUsersAdmin);
router.delete('/admin/subscriptions/:id', protectAdmin, checkPermission('manage_settings'), deleteSubscriptionAdmin);

export default router;
