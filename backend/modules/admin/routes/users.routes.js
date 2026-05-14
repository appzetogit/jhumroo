import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  banUser,
  deleteUser,
  getUserReels,
  getUserActivity,
  verifyUser,
  bulkUserAction
} from '../controllers/users.controller.js';
import { protectAdmin, checkPermission } from '../../../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// User management routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', checkPermission('manage_users'), updateUser);
router.put('/:id/ban', checkPermission('ban_users'), banUser);
router.put('/:id/verify', checkPermission('manage_users'), verifyUser);
router.delete('/:id', checkPermission('manage_users'), deleteUser);

// User data routes
router.get('/:id/reels', getUserReels);
router.get('/:id/activity', getUserActivity);

// Bulk operations
router.post('/bulk-action', checkPermission('manage_users'), bulkUserAction);

export default router;
