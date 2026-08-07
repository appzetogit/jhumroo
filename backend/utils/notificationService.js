import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import Follow from '../models/Follow.model.js';
import { messaging } from '../config/firebase.js';
import { sendToUser } from '../config/socket.js';

/**
 * Create an in-app notification and optionally send a push notification via FCM
 * @param {object} options
 * @param {string} options.recipient - Recipient user ID
 * @param {string} options.sender - Sender user ID  
 * @param {string} options.type - Notification type
 * @param {string} [options.reel] - Reel ID (optional)
 * @param {string} [options.comment] - Comment ID (optional)
 * @param {string} [options.text] - Custom text (optional)
 * @param {boolean} [options.skipPush=false] - If true, skip FCM push (in-app only)
 */
export const createNotification = async ({ recipient, sender, type, reel, comment, text, skipPush = false }) => {
  try {
    // Avoid self-notifications
    if (sender && recipient.toString() === sender.toString()) {
      return null;
    }

    // Automatically detect and upgrade follow to follow_back if recipient is already following sender
    if (type === 'follow') {
      try {
        const isFollowBack = await Follow.findOne({
          follower: recipient,
          following: sender,
          status: 'accepted'
        });
        if (isFollowBack) {
          type = 'follow_back';
        }
      } catch (err) {
        console.error('Error checking follow back status:', err);
      }
    }

    // Avoid duplicate notifications for follows, requests, likes, and mentions
    if (['follow', 'follow_request', 'follow_accept', 'follow_back', 'like', 'mention'].includes(type)) {
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
        try {
          sendToUser(recipient.toString(), 'new_notification', existing);
        } catch (sErr) {}
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

    try {
      sendToUser(recipient.toString(), 'new_notification', notification);
    } catch (socketErr) {}

    // Send push notification if messaging is initialized and not suppressed
    if (!skipPush && messaging) {
      try {
        // Fetch recipient's FCM tokens and notification preferences
        const user = await User.findById(recipient).select('fcmToken fcmTokenMobile username fullName notificationSettings');
        const senderUser = sender ? await User.findById(sender).select('username fullName') : null;
        
        if (user) {
          const settings = user.notificationSettings || {};
          let shouldSkip = false;
          if (type === 'like' && settings.likes === false) {
            shouldSkip = true;
          } else if (type === 'comment' && settings.comments === false) {
            shouldSkip = true;
          } else if (['follow', 'follow_back', 'follow_request', 'follow_accept'].includes(type) && settings.newFollowers === false) {
            shouldSkip = true;
          } else if (type === 'mention' && settings.mentionsAndTags === false) {
            shouldSkip = true;
          }

          if (shouldSkip) {
            console.log(`FCM: Skipping push notification of type ${type} for recipient ${recipient} due to user preferences.`);
            return notification;
          }
        }
        
        if (user && (user.fcmToken || user.fcmTokenMobile)) {
          // Deduplicate tokens — same token can be stored in both fields (e.g., single device)
          const rawTokens = [user.fcmToken, user.fcmTokenMobile].filter(t => t && t.trim() !== '');
          const tokens = [...new Set(rawTokens)];
          
          if (tokens.length > 0) {
            const senderName = senderUser?.fullName || senderUser?.username || 'Someone';
            let title = 'Jhumroo';
            let body = text || '';

            // Customize notification content based on type
            switch (type) {
              case 'report_status':
                title = 'Report Update';
                body = text || 'Your reported problem status has been updated';
                break;
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
              case 'follow_back':
                title = 'New Follower';
                body = `${senderName} followed you back`;
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

            // IMPORTANT: Send data-only message (no `notification` block).
            // If both `notification` AND `data` are present, Android/Chrome shows TWO notifications:
            //   1. One from FCM's automatic handling of `notification` block
            //   2. One from the service worker's onBackgroundMessage handler
            // By sending data-only, ONLY the service worker shows the notification (one notification).
            const message = {
              data: {
                type,
                title,
                body: body.length > 100 ? body.substring(0, 97) + '...' : body,
                senderId: sender ? sender.toString() : '',
                reelId: reel ? reel.toString() : '',
                commentId: comment ? comment.toString() : '',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
              tokens: tokens,
            };

            let response = null;
            const invalidTokens = [];

            try {
              response = await messaging.sendEachForMulticast(message);
              console.log(`FCM: Successfully sent ${response.successCount} notifications; ${response.failureCount} failed.`);
              
              if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                  if (!resp.success) {
                    const code = resp.error?.code;
                    console.error(`FCM: Failure for token ${tokens[idx].substring(0, 20)}...:`, resp.error?.message);
                    if (
                      code === 'messaging/invalid-registration-token' ||
                      code === 'messaging/registration-token-not-registered'
                    ) {
                      invalidTokens.push(tokens[idx]);
                    }
                  }
                });
              }
            } catch (multicastErr) {
              const rawMsg = multicastErr?.message || '';
              const isBatch404 = rawMsg.includes('/batch') && (rawMsg.includes('404') || rawMsg.includes('Not Found'));
              
              if (!isBatch404) {
                throw multicastErr;
              }

              console.warn('FCM: Multicast failed with 404 (likely /batch unsupported). Falling back to per-token send().');
              
              const baseMessage = { ...message };
              delete baseMessage.tokens;

              let successCount = 0;
              let failureCount = 0;

              for (const token of tokens) {
                try {
                  await messaging.send({ ...baseMessage, token });
                  successCount++;
                } catch (err) {
                  failureCount++;
                  const code = err?.errorInfo?.code || err?.code;
                  console.error(`FCM: Token send failed:`, code, err?.message);
                  if (
                    code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/registration-token-not-registered'
                  ) {
                    invalidTokens.push(token);
                  }
                }
              }

              console.log(`FCM: Fallback results: ${successCount} success, ${failureCount} failures.`);
            }

            // Cleanup invalid tokens from User model
            if (invalidTokens.length > 0) {
              console.log(`FCM Cleanup: Removing ${invalidTokens.length} invalid token(s) from users.`);
              await User.updateMany(
                { fcmToken: { $in: invalidTokens } },
                { $set: { fcmToken: '' } }
              );
              await User.updateMany(
                { fcmTokenMobile: { $in: invalidTokens } },
                { $set: { fcmTokenMobile: '' } }
              );
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
