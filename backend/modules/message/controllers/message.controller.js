import Message from '../../../models/Message.model.js';
import Conversation from '../../../models/Conversation.model.js';
import User from '../../../models/User.model.js';
import Reel from '../../../models/Reel.model.js';
import Follow from '../../../models/Follow.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { uploadImage, uploadVideo, deleteFile } from '../../../config/cloudinary.js';
import { getIO } from '../../../config/socket.js';
import fs from 'fs';

/**
 * @desc    Get all conversations for a user
 * @route   GET /api/messages/conversations
 * @access  Private
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 15, 50);
  const skip = (page - 1) * limit;

  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
    deletedBy: { $ne: userId }
  })
    .populate('participants', 'username fullName profilePicture isVerified')
    .populate('lastMessage.sender', 'username')
    .sort({ 'lastMessage.timestamp': -1 })
    .skip(skip)
    .limit(limit);

  const formattedConversations = conversations.map(conv => {
    const otherParticipant = conv.participants.find(
      p => p._id.toString() !== userId.toString()
    );

    return {
      _id: conv._id,
      participant: otherParticipant,
      lastMessage: conv.lastMessage,
      unreadCount: conv.getUnreadCount(userId),
      isPinned: conv.pinnedBy?.includes(userId) || false,
      isMuted: conv.mutedBy?.includes(userId) || false,
      updatedAt: conv.updatedAt
    };
  });

  // Sort pinned first
  formattedConversations.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const total = await Conversation.countDocuments({
    participants: userId,
    isActive: true,
    deletedBy: { $ne: userId }
  });

  res.status(200).json({
    success: true,
    conversations: formattedConversations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get or create conversation with a user
 * @route   GET /api/messages/conversation/:userId
 * @access  Private
 */
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  // Check if trying to message self
  if (userId === currentUserId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot message yourself'
    });
  }

  // Check if user exists
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Privacy Check
  if (targetUser.messagePrivacy === 'no_one') {
    return res.status(403).json({
      success: false,
      message: 'Direct messages not allowed by this user'
    });
  }

  if (targetUser.messagePrivacy === 'friends') {
    // Check if mutual followers (Friends)
    const [isFollowing, isFollower] = await Promise.all([
      Follow.findOne({ follower: currentUserId, following: userId, status: 'accepted' }),
      Follow.findOne({ follower: userId, following: currentUserId, status: 'accepted' })
    ]);

    if (!isFollowing || !isFollower) {
      return res.status(403).json({
        success: false,
        message: 'Only mutual followers can message this user'
      });
    }
  }

  // Find or create conversation
  const conversation = await Conversation.findOrCreateConversation(currentUserId, userId);

  res.status(200).json({
    success: true,
    conversation
  });
});

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Check if user is part of this conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  // Get messages
  const messages = await Message.find({
    conversation: conversationId,
    $or: [
      { isDeleted: false },
      { isDeleted: true, deletedBy: { $ne: userId } }
    ],
    isUnsent: false
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'username fullName profilePicture')
    .populate('content.reelId', 'video caption')
    .populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'username fullName' }
    })
    .lean();

  // Filter out messages deleted by current user
  const visibleMessages = messages.filter(msg => {
    if (!msg.isDeleted) return true;
    return !msg.deletedBy.some(id => id.toString() === userId.toString());
  });

  const totalMessages = await Message.countDocuments({
    conversation: conversationId,
    isDeleted: false,
    isUnsent: false
  });

  res.status(200).json({
    success: true,
    messages: visibleMessages.reverse(),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      hasMore: skip + messages.length < totalMessages
    }
  });
});

/**
 * @desc    Send a message
 * @route   POST /api/messages/send
 * @access  Private
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, receiverId, messageType, text, reelId, replyTo } = req.body;
  const senderId = req.user._id;

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId
    });
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
  } else if (receiverId) {
    conversation = await Conversation.findOrCreateConversation(senderId, receiverId);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Conversation ID or Receiver ID required'
    });
  }

  // Get receiver ID
  const receiverParticipant = conversation.participants.find(
    p => p._id.toString() !== senderId.toString()
  );

  // Fetch full receiver user data for privacy check
  const receiver = await User.findById(receiverParticipant._id || receiverParticipant);
  if (!receiver) {
    return res.status(404).json({ success: false, message: 'Receiver not found' });
  }

  // Privacy Check
  if (receiver.messagePrivacy === 'no_one') {
    return res.status(403).json({ success: false, message: 'Direct messages not allowed by this user' });
  }

  if (receiver.messagePrivacy === 'friends') {
    // Check if mutual followers (Friends)
    const [isFollowing, isFollower] = await Promise.all([
      Follow.findOne({ follower: senderId, following: receiver._id, status: 'accepted' }),
      Follow.findOne({ follower: receiver._id, following: senderId, status: 'accepted' })
    ]);

    if (!isFollowing || !isFollower) {
      return res.status(403).json({
        success: false,
        message: 'Only mutual followers can message this user'
      });
    }
  }

  // Create message content based on type
  const content = {};
  
  if (messageType === 'text') {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }
    content.text = text.trim();
  } else if (messageType === 'reel') {
    if (!reelId) {
      return res.status(400).json({
        success: false,
        message: 'Reel ID is required'
      });
    }
    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }
    content.reelId = reelId;
  } else if (messageType === 'image' || messageType === 'video') {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media file is required'
      });
    }

    // Upload to Cloudinary
    const uploadFn = messageType === 'image' ? uploadImage : uploadVideo;
    const result = await uploadFn(req.file.path, 'jhumroo/messages');
    
    // Delete temp file
    fs.unlinkSync(req.file.path);

    content.mediaUrl = result.url;
    content.mediaPublicId = result.publicId;
    if (result.thumbnail) content.thumbnail = result.thumbnail;
  }

  // Create message
  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    receiver: receiver._id,
    messageType,
    content,
    replyTo
  });

  // Populate sender info
  await message.populate('sender', 'username fullName profilePicture');
  if (messageType === 'reel') {
    await message.populate('content.reelId', 'video caption');
  }
  
  // Populate replyTo if exists
  if (replyTo) {
    await message.populate({
      path: 'replyTo',
      populate: { path: 'sender', select: 'username fullName' }
    });
  }

  // Emit socket event for real-time delivery
  const io = getIO();
  io.to(receiver._id.toString()).emit('new_message', {
    conversationId: conversation._id,
    message: message.toObject()
  });

  res.status(201).json({
    success: true,
    message
  });
});

/**
 * @desc    Mark message as read
 * @route   PUT /api/messages/:messageId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findOne({
    _id: messageId,
    receiver: userId
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  if (!message.isRead) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    // Reset unread count in conversation
    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      conversation.resetUnreadCount(userId);
      await conversation.save();
    }

    // Emit socket event for read receipt
    const io = getIO();
    io.to(message.sender.toString()).emit('message_read', {
      messageId: message._id,
      conversationId: message.conversation,
      readAt: message.readAt
    });
  }

  res.status(200).json({
    success: true,
    message: 'Message marked as read'
  });
});

/**
 * @desc    Mark all messages in conversation as read
 * @route   PUT /api/messages/conversation/:conversationId/read
 * @access  Private
 */
export const markConversationAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  // Check if user is part of this conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  // Mark all unread messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      receiver: userId,
      isRead: false
    },
    {
      $set: { isRead: true, readAt: new Date() }
    }
  );

  // Reset unread count
  conversation.resetUnreadCount(userId);
  await conversation.save();

  // Emit socket event
  const io = getIO();
  const otherParticipant = conversation.participants.find(
    p => p.toString() !== userId.toString()
  );
  io.to(otherParticipant.toString()).emit('conversation_read', {
    conversationId,
    readBy: userId
  });

  res.status(200).json({
    success: true,
    message: 'Conversation marked as read'
  });
});

/**
 * @desc    Delete message (for self)
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findOne({
    _id: messageId,
    $or: [{ sender: userId }, { receiver: userId }]
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  // Add user to deletedBy array
  if (!message.deletedBy.includes(userId)) {
    message.deletedBy.push(userId);
    message.isDeleted = true;
    await message.save();
  }

  res.status(200).json({
    success: true,
    message: 'Message deleted'
  });
});

/**
 * @desc    Unsend message (delete for everyone)
 * @route   POST /api/messages/:messageId/unsend
 * @access  Private
 */
export const unsendMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findOne({
    _id: messageId,
    sender: userId
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found or you are not the sender'
    });
  }

  // Check if message is within unsend time limit (e.g., 15 minutes)
  const minutesSinceSent = (new Date() - message.createdAt) / 1000 / 60;
  if (minutesSinceSent > 15) {
    return res.status(400).json({
      success: false,
      message: 'Message can only be unsent within 15 minutes'
    });
  }

  message.isUnsent = true;
  message.content = { text: 'This message was unsent' };
  await message.save();

  // Delete media from Cloudinary if exists
  if (message.content.mediaPublicId) {
    await deleteFile(message.content.mediaPublicId, message.messageType);
  }

  // Emit socket event
  const io = getIO();
  io.to(message.receiver.toString()).emit('message_unsent', {
    messageId: message._id,
    conversationId: message.conversation
  });

  res.status(200).json({
    success: true,
    message: 'Message unsent'
  });
});

/**
 * @desc    Soft delete conversation for user
 * @route   DELETE /api/messages/conversations/:conversationId
 * @access  Private
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  // Add user to deletedBy in conversation document
  if (!conversation.deletedBy.includes(userId)) {
    conversation.deletedBy.push(userId);
    await conversation.save();
  }

  // Also mark all existing messages as deleted for this user
  await Message.updateMany(
    {
      conversation: conversationId,
      $or: [{ sender: userId }, { receiver: userId }]
    },
    {
      $addToSet: { deletedBy: userId }
    }
  );

  res.status(200).json({
    success: true,
    message: 'Conversation deleted'
  });
});

/**
 * @desc    Pin a message
 * @route   PUT /api/messages/:messageId/pin
 * @access  Private
 */
export const pinMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findOne({
    _id: messageId,
    $or: [{ sender: userId }, { receiver: userId }]
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  message.isPinned = true;
  await message.save();

  // Emit socket event
  const io = getIO();
  const otherParticipant = message.sender.toString() === userId.toString() ? message.receiver : message.sender;
  io.to(otherParticipant.toString()).emit('message_pinned', {
    messageId: message._id,
    conversationId: message.conversation,
    isPinned: true
  });

  res.status(200).json({
    success: true,
    message: 'Message pinned'
  });
});

/**
 * @desc    Unpin a message
 * @route   PUT /api/messages/:messageId/unpin
 * @access  Private
 */
export const unpinMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findOne({
    _id: messageId,
    $or: [{ sender: userId }, { receiver: userId }]
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  message.isPinned = false;
  await message.save();

  // Emit socket event
  const io = getIO();
  const otherParticipant = message.sender.toString() === userId.toString() ? message.receiver : message.sender;
  io.to(otherParticipant.toString()).emit('message_pinned', {
    messageId: message._id,
    conversationId: message.conversation,
    isPinned: false
  });

  res.status(200).json({
    success: true,
    message: 'Message unpinned'
  });
});

/**
 * @desc    Toggle pin conversation
 * @route   PUT /api/messages/conversations/:conversationId/pin
 * @access  Private
 */
export const togglePinConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const isPinned = conversation.pinnedBy.includes(userId);
  if (isPinned) {
    conversation.pinnedBy = conversation.pinnedBy.filter(id => id.toString() !== userId.toString());
  } else {
    conversation.pinnedBy.push(userId);
  }

  await conversation.save();
  res.status(200).json({ success: true, isPinned: !isPinned });
});

/**
 * @desc    Toggle mute conversation
 * @route   PUT /api/messages/conversations/:conversationId/mute
 * @access  Private
 */
export const toggleMuteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const isMuted = conversation.mutedBy.includes(userId);
  if (isMuted) {
    conversation.mutedBy = conversation.mutedBy.filter(id => id.toString() !== userId.toString());
  } else {
    conversation.mutedBy.push(userId);
  }

  await conversation.save();
  res.status(200).json({ success: true, isMuted: !isMuted });
});
