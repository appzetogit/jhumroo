import express from 'express';
import {
  adminLogin,
  refreshAdminToken,
  adminLogout,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getActivityLog
} from '../controllers/auth.controller.js';
import { protectAdmin } from '../../../middleware/adminAuth.js';

const router = express.Router();

// Public routes
router.post('/login', adminLogin);
router.post('/refresh', refreshAdminToken);

// Protected routes
router.use(protectAdmin); // All routes below require authentication

router.post('/logout', adminLogout);
router.get('/me', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.put('/change-password', changeAdminPassword);
router.get('/activity-log', getActivityLog);

export default router;
