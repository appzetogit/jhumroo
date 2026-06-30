import express from 'express';
import { 
  sendNotification, 
  getNotifications,
  getAdminAlerts,
  markAlertsAsRead,
  markAlertAsRead,
  clearAdminAlerts
} from '../controllers/notification.controller.js';
import { protectAdmin } from '../../../middleware/adminAuth.js';
import { uploadImage } from '../../../middleware/upload.js';

const router = express.Router();

// Require admin authentication for all notification routes
router.use(protectAdmin);

router.get('/', getNotifications);
router.post('/send', uploadImage, sendNotification);

router.get('/alerts', getAdminAlerts);
router.put('/alerts/read-all', markAlertsAsRead);
router.put('/alerts/:id/read', markAlertAsRead);
router.delete('/alerts/clear', clearAdminAlerts);

export default router;
