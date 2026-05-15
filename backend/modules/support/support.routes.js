import express from 'express';
import { 
  createSupportRequest, 
  getAllSupportRequests, 
  updateSupportRequestStatus,
  getMySupportRequests
} from './support.controller.js';
import { protect } from '../../middleware/auth.js';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// User routes
router.post('/', protect, createSupportRequest);
router.get('/me', protect, getMySupportRequests);

// Admin routes
router.get('/all', protectAdmin, getAllSupportRequests);
router.patch('/:id/status', protectAdmin, updateSupportRequestStatus);

export default router;
