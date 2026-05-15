import express from 'express';
import { getStaticPage, updateStaticPage } from './staticPage.controller.js';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// Public routes
router.get('/:slug', getStaticPage);

// Admin routes
router.post('/update', protectAdmin, updateStaticPage);

export default router;
