import AdminNotification from '../../../models/AdminNotification.model.js';
import User from '../../../models/User.model.js';
import Notification from '../../../models/Notification.model.js';
import { uploadImage } from '../../../config/cloudinary.js';
import { messaging } from '../../../config/firebase.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import fs from 'fs';

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
    if (country) query.country = { $regex: new RegExp(`^${country}$`, 'i') };
    if (state) query.state = { $regex: new RegExp(`^${state}$`, 'i') };
    if (district) query.district = { $regex: new RegExp(`^${district}$`, 'i') };
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

  // 2. Collect FCM tokens
  const tokens = [];
  users.forEach(user => {
    if (user.fcmToken && user.fcmToken.trim() !== '') tokens.push(user.fcmToken);
    if (user.fcmTokenMobile && user.fcmTokenMobile.trim() !== '') tokens.push(user.fcmTokenMobile);
  });

  // 3. Dispatch Firebase Push Notifications if tokens and messaging service are available
  let fcmSentCount = 0;
  if (messaging && tokens.length > 0) {
    try {
      const payload = {
        notification: {
          title: title,
          body: message,
          ...(imageUrl && { imageUrl })
        },
        data: {
          type: 'admin_announcement',
          title: title,
          body: message,
          ...(imageUrl && { imageUrl })
        },
        tokens: tokens
      };

      const response = await messaging.sendEachForMulticast(payload);
      fcmSentCount = response.successCount;
      console.log(`FCM: Admin announcement successfully sent to ${response.successCount} tokens; ${response.failureCount} failed.`);
    } catch (fcmError) {
      console.error('FCM Multicast error during admin dispatch:', fcmError);
      // We continue since the in-app notification is already recorded
    }
  }

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
