import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  removeFollower,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  checkFollowStatus,
  getFollowRequestsCount
} from '../controllers/follow.controller.js';
import { protect, optionalAuth } from '../../../middleware/auth.js';

const router = express.Router();

// Protected routes
router.post('/:userId', protect, followUser);
router.delete('/:userId', protect, unfollowUser);
router.delete('/followers/:userId', protect, removeFollower);
router.get('/check/:userId', protect, checkFollowStatus);

// Get followers/following (public with optional auth)
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

// Follow requests (private accounts)
router.get('/requests/count', protect, getFollowRequestsCount);
router.get('/requests/pending', protect, getFollowRequests);
router.put('/requests/:userId/accept', protect, acceptFollowRequest);
router.delete('/requests/:userId', protect, rejectFollowRequest);

export default router;
