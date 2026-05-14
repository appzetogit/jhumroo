import express from 'express';
import {
  getReports,
  updateReportStatus,
  removeReelFromFeed,
  banUser
} from '../controllers/report.controller.js';
import { protectAdmin } from '../../../middleware/adminAuth.js';

const router = express.Router();

// All routes are protected and admin only
router.use(protectAdmin);

router.get('/', getReports);
router.put('/:id', updateReportStatus);
router.post('/remove-reel/:reelId', removeReelFromFeed);
router.post('/ban-user/:userId', banUser);

export default router;
