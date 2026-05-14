import express from 'express';
import { protect } from '../../../middleware/auth.js';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  markConversationAsRead,
  deleteMessage,
  unsendMessage,
  deleteConversation
} from '../controllers/message.controller.js';
import { uploadImage, uploadVideo } from '../../../middleware/upload.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Conversation routes
router.get('/conversations', getConversations);
router.get('/conversation/:userId', getOrCreateConversation);
router.delete('/conversation/:conversationId', deleteConversation);
router.put('/conversation/:conversationId/read', markConversationAsRead);

// Message routes
router.get('/:conversationId', getMessages);
router.post('/send', sendMessage);
router.post('/send/image', uploadImage, sendMessage);
router.post('/send/video', uploadVideo, sendMessage);

// Message actions
router.put('/:messageId/read', markAsRead);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/unsend', unsendMessage);

export default router;
