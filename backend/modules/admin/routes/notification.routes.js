import express from 'express';
import { 
  sendNotification, 
  getNotifications
} from '../controllers/notification.controller.js';
import { protectAdmin, checkPermission } from '../../../middleware/adminAuth.js';
import { uploadImage } from '../../../middleware/upload.js';

const router = express.Router();

// Require admin authentication for all notification routes
router.use(protectAdmin);

router.get('/', getNotifications);
router.post('/send', checkPermission('manage_users'), uploadImage, sendNotification);


export default router;
