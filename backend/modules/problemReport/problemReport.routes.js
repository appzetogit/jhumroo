import express from 'express';
import { 
  createProblemReport, 
  getAllProblemReports, 
  updateProblemReportStatus,
  getMyProblemReports,
  uploadAttachment
} from './problemReport.controller.js';
import { protect } from '../../middleware/auth.js';
import { protectAdmin } from '../../middleware/adminAuth.js';
import { uploadProblemAttachment, handleMulterError } from '../../middleware/upload.js';

const router = express.Router();

// User routes
router.post('/', protect, createProblemReport);
router.post('/upload-attachment', protect, uploadProblemAttachment, handleMulterError, uploadAttachment);
router.get('/me', protect, getMyProblemReports);

// Admin routes
router.get('/all', protectAdmin, getAllProblemReports);
router.patch('/:id/status', protectAdmin, updateProblemReportStatus);

export default router;
