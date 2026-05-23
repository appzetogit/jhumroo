/**
 * One-time cleanup script: Fix users with duplicate FCM tokens
 * 
 * Problem: Some users have both fcmToken AND fcmTokenMobile set to DIFFERENT values.
 * This causes two push notifications to be sent to the same physical device.
 * 
 * Fix: For any user where both fields are set AND different, clear fcmTokenMobile
 * so only fcmToken remains. The web/PWA app always registers as fcmToken.
 * 
 * Run once: node fix_duplicate_fcm_tokens.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function fixDuplicateFcmTokens() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const users = db.collection('users');

    // Find users where BOTH tokens are set AND they are different
    const affectedUsers = await users.find({
      fcmToken: { $exists: true, $ne: '', $nin: [null] },
      fcmTokenMobile: { $exists: true, $ne: '', $nin: [null] },
      $expr: { $ne: ['$fcmToken', '$fcmTokenMobile'] }
    }).toArray();

    console.log(`Found ${affectedUsers.length} user(s) with duplicate FCM tokens`);

    if (affectedUsers.length === 0) {
      console.log('Nothing to fix. All good!');
      process.exit(0);
    }

    for (const user of affectedUsers) {
      console.log(`  User ${user._id} (${user.username}): fcmToken=${user.fcmToken?.substring(0, 20)}... fcmTokenMobile=${user.fcmTokenMobile?.substring(0, 20)}...`);
    }

    // Clear fcmTokenMobile for all affected users (keep fcmToken - the web/PWA token)
    const result = await users.updateMany(
      {
        fcmToken: { $exists: true, $ne: '', $nin: [null] },
        fcmTokenMobile: { $exists: true, $ne: '', $nin: [null] },
        $expr: { $ne: ['$fcmToken', '$fcmTokenMobile'] }
      },
      { $set: { fcmTokenMobile: '' } }
    );

    console.log(`\n✅ Fixed ${result.modifiedCount} user(s). Cleared fcmTokenMobile for all affected users.`);
    console.log('Users will now only receive ONE push notification per event.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixDuplicateFcmTokens();
