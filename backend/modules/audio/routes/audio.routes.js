import express from 'express';
import { 
  getAudios, 
  getAudioById, 
  createAudio, 
  updateAudio, 
  deleteAudio,
  toggleSaveAudio,
  getSavedAudios
} from '../controllers/audio.controller.js';
import { protect, optionalAuth } from '../../../middleware/auth.js';
import { protectAdmin } from '../../../middleware/adminAuth.js';
import { uploadAudioLibrary } from '../../../middleware/upload.js';

const router = express.Router();

// User routes
router.get('/', optionalAuth, getAudios);
router.get('/saved', protect, getSavedAudios);
router.get('/:id', getAudioById);
router.post('/:id/save', protect, toggleSaveAudio);

// Admin routes (Protected)
router.post('/', protectAdmin, uploadAudioLibrary, createAudio);
router.put('/:id', protectAdmin, uploadAudioLibrary, updateAudio);
router.delete('/:id', protectAdmin, deleteAudio);

export default router;
