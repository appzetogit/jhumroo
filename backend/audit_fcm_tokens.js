/**
 * Audit FCM tokens for all users
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function auditFcmTokens() {
  await mongoose.connect(MONGO_URI);
  
  const db = mongoose.connection.db;
  const users = db.collection('users');

  const all = await users.find({
    $or: [
      { fcmToken: { $exists: true, $ne: '' } },
      { fcmTokenMobile: { $exists: true, $ne: '' } }
    ]
  }).project({ username: 1, fcmToken: 1, fcmTokenMobile: 1 }).toArray();

  console.log(`\nFound ${all.length} user(s) with FCM tokens:\n`);
  all.forEach(u => {
    const hasBoth = u.fcmToken && u.fcmTokenMobile;
    const same = u.fcmToken === u.fcmTokenMobile;
    console.log(`User: ${u.username}`);
    console.log(`  fcmToken:       ${u.fcmToken ? u.fcmToken.substring(0, 35) + '...' : '(empty)'}`);
    console.log(`  fcmTokenMobile: ${u.fcmTokenMobile ? u.fcmTokenMobile.substring(0, 35) + '...' : '(empty)'}`);
    if (hasBoth && same)  console.log(`  ⚠️  SAME TOKEN IN BOTH FIELDS - will cause duplicate push!`);
    if (hasBoth && !same) console.log(`  ⚠️  DIFFERENT TOKENS IN BOTH FIELDS - will cause duplicate push!`);
    if (!hasBoth)         console.log(`  ✅  Single token - OK`);
    console.log('');
  });

  await mongoose.disconnect();
}

auditFcmTokens().catch(console.error).finally(() => process.exit(0));
