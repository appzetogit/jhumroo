import express from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { uploadReel, toggleFollowCreator } from '../controllers/reel.controller.js';
import { trackActivity } from '../controllers/activity.controller.js';
import { getFeed } from '../controllers/feed.controller.js';
import { protectPostgres, optionalAuthPostgres } from '../middleware/auth.middleware.js';

const router = express.Router();

// 1. Authentication Endpoints
router.post('/auth/register', register);
router.post('/auth/login', login);

// 2. Reels & Creator Management
router.post('/reels/upload', protectPostgres, uploadReel);
router.post('/follows', protectPostgres, toggleFollowCreator);

// 3. User Activity & Watch Time Tracking
router.post('/activity', protectPostgres, trackActivity);

// 4. Personalized Recommendation Feed Generator
// optionalAuthPostgres is used so that guest users can also fetch public trending reels
router.get('/feed', optionalAuthPostgres, getFeed);

export default router;
