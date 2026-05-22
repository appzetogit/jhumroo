import express from 'express';
import { sendNotification, getNotifications } from '../controllers/notification.controller.js';
import { protectAdmin } from '../../../middleware/adminAuth.js';
import { uploadImage } from '../../../middleware/upload.js';

const router = express.Router();

// Require admin authentication for all notification routes
router.use(protectAdmin);

router.get('/', getNotifications);
router.post('/send', uploadImage, sendNotification);

export default router;
