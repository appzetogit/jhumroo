import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Monkey patch Date.now to adjust for clock drift (subtracting 10s to ensure iat is in the past)
const driftMs = -10000;
const originalNow = Date.now;
Date.now = function() {
  return originalNow() + driftMs;
};

// Now import the rest
import { messaging } from './config/firebase.js';
import User from './models/User.model.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    const user = await User.findById('6a104e366a85cb7d1a16966c');
    if (!user) {
      console.error('User 6a104e366a85cb7d1a16966c not found.');
      return;
    }

    const token = user.fcmToken || user.fcmTokenMobile;
    if (!token) {
      console.error('User has no FCM token');
      return;
    }

    console.log('Using FCM Token:', token);

    if (!messaging) {
      console.error('Firebase messaging is NOT initialized. Check credentials / path.');
      return;
    }

    const message = {
      notification: {
        title: 'Jhumroo Instant Test',
        body: 'Hello Aman, this is an instant end-to-end push notification from Firebase!',
      },
      data: {
        type: 'test',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      token: token
    };

    console.log('Sending message to Firebase...');
    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);

  } catch (err) {
    console.error('Error in Firebase sending process:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
