import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './backend/models/Notification.model.js';
import User from './backend/models/User.model.js';

dotenv.config({ path: './backend/.env' });

async function checkMentions() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const notifications = await Notification.find({ type: 'mention' })
    .populate('recipient', 'username')
    .populate('sender', 'username')
    .sort({ createdAt: -1 })
    .limit(5);
    
  console.log('Recent Mention Notifications:', JSON.stringify(notifications, null, 2));
  
  const allNotifications = await Notification.countDocuments({ type: 'mention' });
  console.log('Total Mention Notifications:', allNotifications);
  
  await mongoose.disconnect();
}

checkMentions();
