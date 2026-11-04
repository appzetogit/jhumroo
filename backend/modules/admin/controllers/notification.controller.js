import AdminNotification from '../../../models/AdminNotification.model.js';
import User from '../../../models/User.model.js';
import Notification from '../../../models/Notification.model.js';
import { uploadImage } from '../../../config/cloudinary.js';
import { sendPush } from '../../../utils/notificationService.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import fs from 'fs';
import { escapeRegex } from '../../../utils/regex.js';

/**
 * @desc    Send a targeted/public notification and save log
 * @route   POST /api/admin/notifications/send
 * @access  Private (Admin)
 */
export const sendNotification = asyncHandler(async (req, res) => {
  const { title, message, targetType, country, state, district } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      message: 'Title and message are required'
    });
  }

  let imageUrl = '';
  
  // Handle image upload if present
  if (req.file) {
    try {
      const result = await uploadImage(req.file.path, 'jhumroo/admin_notifications');
      imageUrl = result.url;
      // Clean up local temp file
      fs.unlinkSync(req.file.path);
    } catch (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to upload notification image'
      });
    }
  }

  // Construct query to match targeted users
  const query = { isActive: true, isBanned: false };
  if (targetType === 'location') {
    if (country) query.country = { $regex: new RegExp(`^${escapeRegex(country)}$`, 'i') };
    if (state) query.state = { $regex: new RegExp(`^${escapeRegex(state)}$`, 'i') };
    if (district) query.district = { $regex: new RegExp(`^${escapeRegex(district)}$`, 'i') };
  }

  // Find users matching query
  const users = await User.find(query).select('_id fcmToken fcmTokenMobile');

  if (users.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No users found matching the targeting criteria'
    });
  }

  // 1. Create in-app notifications in database in bulk
  const inAppNotifications = users.map(user => ({
    recipient: user._id,
    sender: req.admin._id,
    type: 'message', // Uses existing enum type
    text: `${title}: ${message}`
  }));

  if (inAppNotifications.length > 0) {
    await Notification.insertMany(inAppNotifications);
  }

  // 2. Collect FCM tokens — deduplicate per user to prevent sending 2 pushes to same device
  const tokens = [];
  const seenTokens = new Set();
  users.forEach(user => {
    const rawTokens = [user.fcmToken, user.fcmTokenMobile].filter(t => t && t.trim() !== '');
    const uniqueTokens = [...new Set(rawTokens)]; // remove duplicates within same user
    uniqueTokens.forEach(t => {
      if (!seenTokens.has(t)) {
        seenTokens.add(t);
        tokens.push(t);
      }
    });
  });

  // 3. Dispatch Firebase Push Notifications if tokens and messaging service are available
  // Data-only message (no `notification` block) — prevents Android from showing 2 notifications
  // High priority so killed/dozing Android apps (vivo/oppo savers) wake and show it now.
  const fcmSentCount = await sendPush({
    data: {
      type: 'admin_announcement',
      title,
      body: message,
      ...(imageUrl && { imageUrl })
    },
    android: { priority: 'high', ttl: 24 * 60 * 60 * 1000 }
  }, tokens);

  // 4. Create AdminNotification dispatch log
  const adminNotification = await AdminNotification.create({
    title,
    message,
    imageUrl,
    targetType: targetType || 'all',
    targetLocation: {
      country: country || '',
      state: state || '',
      district: district || ''
    },
    sentCount: users.length,
    status: 'sent',
    sender: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: 'Notification successfully dispatched',
    dispatch: adminNotification,
    sentCount: users.length,
    fcmSentCount
  });
});

/**
 * @desc    Get recent dispatches list
 * @route   GET /api/admin/notifications
 * @access  Private (Admin)
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await AdminNotification.find()
    .sort({ createdAt: -1 })
    .populate('sender', 'username email');

  res.status(200).json({
    success: true,
    notifications
  });
});
