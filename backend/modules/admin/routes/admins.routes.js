import express from 'express';
import {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  updateAdminPermissions,
  getAdminStats
} from '../controllers/admins.controller.js';
import { protectAdmin, superAdminOnly, checkPermission } from '../../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// Admin management routes (require super_admin or manage_admins permission)
router.get('/', checkPermission('manage_admins'), getAllAdmins);
router.get('/stats', checkPermission('manage_admins'), getAdminStats);
router.get('/:id', checkPermission('manage_admins'), getAdminById);

// Super admin only routes
router.post('/', superAdminOnly, createAdmin);
router.put('/:id', superAdminOnly, updateAdmin);
router.delete('/:id', superAdminOnly, deleteAdmin);
router.put('/:id/toggle-status', superAdminOnly, toggleAdminStatus);
router.put('/:id/permissions', superAdminOnly, updateAdminPermissions);

export default router;
