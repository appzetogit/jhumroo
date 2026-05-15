import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import { messaging } from '../config/firebase.js';

/**
 * Create an in-app notification and send a push notification via FCM
 */
export const createNotification = async ({ recipient, sender, type, reel, comment, text }) => {
  try {
    // Avoid self-notifications
    // Avoid duplicate notifications for follows, requests, likes, and mentions
    if (['follow', 'follow_request', 'follow_accept', 'like', 'mention'].includes(type)) {
      const existing = await Notification.findOne({
        recipient,
        sender,
        type,
        ...(reel && { reel }),
        ...(comment && { comment })
      });

      if (existing) {
        existing.createdAt = new Date();
        existing.isRead = false;
        await existing.save();
        return existing;
      }
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      reel,
      comment,
      text
    });

    // Send push notification if messaging is initialized
    if (messaging) {
      try {
        // Fetch recipient's FCM tokens
        const user = await User.findById(recipient).select('fcmToken fcmTokenMobile username fullName');
        const senderUser = await User.findById(sender).select('username fullName');
        
        if (user && (user.fcmToken || user.fcmTokenMobile)) {
          const tokens = [user.fcmToken, user.fcmTokenMobile].filter(t => t && t.trim() !== '');
          
          if (tokens.length > 0) {
            const senderName = senderUser.fullName || senderUser.username || 'Someone';
            let title = 'Jhumroo';
            let body = text || '';

            // Customize notification content based on type
            switch (type) {
              case 'like':
                title = 'New Like';
                body = `${senderName} liked your video`;
                break;
              case 'comment':
                title = 'New Comment';
                body = `${senderName} commented on your video`;
                break;
              case 'follow':
                title = 'New Follower';
                body = `${senderName} started following you`;
                break;
              case 'follow_request':
                title = 'Follow Request';
                body = `${senderName} requested to follow you`;
                break;
              case 'follow_accept':
                title = 'Follow Request Accepted';
                body = `${senderName} accepted your follow request`;
                break;
              case 'message':
                title = 'New Message';
                body = `${senderName} sent you a message`;
                break;
              case 'mention':
                title = 'New Mention';
                body = `${senderName} mentioned you in a comment`;
                break;
            }

            const message = {
              notification: {
                title,
                body: body.length > 100 ? body.substring(0, 97) + '...' : body,
              },
              data: {
                type,
                senderId: sender.toString(),
                reelId: reel ? reel.toString() : '',
                commentId: comment ? comment.toString() : '',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
              tokens: tokens,
            };

            const response = await messaging.sendEachForMulticast(message);
            console.log(`FCM: Successfully sent ${response.successCount} notifications; ${response.failureCount} failed.`);
            
            // Log details of failures if any
            if (response.failureCount > 0) {
              response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                  console.error(`FCM: Failure for token ${tokens[idx]}:`, resp.error.message);
                }
              });
            }
          }
        }
      } catch (innerError) {
        console.error('Error in FCM sending process:', innerError);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
