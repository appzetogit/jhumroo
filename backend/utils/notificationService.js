import Notification from '../models/Notification.model.js';

export const createNotification = async ({ recipient, sender, type, reel, comment, text }) => {
  try {
    // Avoid self-notifications
    if (recipient.toString() === sender.toString()) return null;

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      reel,
      comment,
      text
    });

    // TODO: Send push notification via Firebase/OneSignal
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
