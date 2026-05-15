import express from 'express';
import { 
  getInterests, 
  createInterest, 
  updateInterest, 
  deleteInterest 
} from '../controllers/interest.controller.js';
import { protectAdmin, checkRole } from '../../../middleware/adminAuth.js';

const router = express.Router();

// Public route for users during onboarding
router.get('/', getInterests);

// Admin routes
router.use(protectAdmin);
router.use(checkRole('admin', 'super_admin'));

router.post('/', createInterest);
router.put('/:id', updateInterest);
router.delete('/:id', deleteInterest);

export default router;
