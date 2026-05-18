import express from 'express';
import {
  sendOTP,
  verifyOTP,
  completeProfile,
  refreshToken,
  getMe,
  logout,
  checkUsername,
  updateInterests
} from '../controllers/auth.controller.js';
import { updateFCMToken } from '../../user/controllers/user.controller.js';
import { protect } from '../../../middleware/auth.js';
import { 
  otpRequestValidation, 
  otpVerifyValidation, 
  registerValidation,
  validate 
} from '../../../middleware/validation.js';
import { otpRateLimiter, authRateLimiter } from '../../../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/send-otp', otpRateLimiter, otpRequestValidation, validate, sendOTP);
router.post('/verify-otp', authRateLimiter, otpVerifyValidation, validate, verifyOTP);
router.post('/refresh-token', refreshToken);
router.get('/check-username/:username', checkUsername);

// Protected routes
router.post('/complete-profile', protect, registerValidation, validate, completeProfile);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/interests', protect, updateInterests);

// FCM token update reference route
router.post('/fcm-token', protect, updateFCMToken);

export default router;
