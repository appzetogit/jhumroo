import express from 'express';
import {
  startLive,
  endLive,
  getActiveLives,
  getLiveById,
  getLiveComments,
  getIceServers
} from '../controllers/live.controller.js';
import { protect, optionalAuth } from '../../../middleware/auth.js';

const router = express.Router();

// Active streams & discovery
router.get('/active', optionalAuth, getActiveLives);
router.get('/ice-servers', optionalAuth, getIceServers);

// Specific stream info
router.get('/:id', optionalAuth, getLiveById);
router.get('/:id/comments', optionalAuth, getLiveComments);

// Broadcaster lifecycle
router.post('/start', protect, startLive);
router.post('/:id/end', protect, endLive);

export default router;
