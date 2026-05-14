import express from 'express';
import { protect, optionalAuth } from '../../../middleware/auth.js';
import {
  createComment,
  getReelComments,
  getCommentReplies,
  toggleCommentLike,
  deleteComment,
  togglePinComment,
  editComment
} from '../controllers/comment.controller.js';
import { commentValidation, validate } from '../../../middleware/validation.js';

const router = express.Router();

// Comment routes on reels
router.post('/reels/:reelId/comments', protect, commentValidation, validate, createComment);
router.get('/reels/:reelId/comments', optionalAuth, getReelComments);

// Comment management
router.get('/comments/:commentId/replies', optionalAuth, getCommentReplies);
router.put('/comments/:commentId', protect, commentValidation, validate, editComment);
router.delete('/comments/:commentId', protect, deleteComment);
router.post('/comments/:commentId/like', protect, toggleCommentLike);
router.put('/comments/:commentId/pin', protect, togglePinComment);

export default router;
