import express from 'express';
import { getStaticPage, updateStaticPage, getAppLinks, updateAppLinks } from './staticPage.controller.js';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// Public routes
router.get('/app-links', getAppLinks);
router.get('/:slug', getStaticPage);

// Admin routes
router.post('/update', protectAdmin, updateStaticPage);
router.post('/app-links', protectAdmin, updateAppLinks);

export default router;
