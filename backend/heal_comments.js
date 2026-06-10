import mongoose from 'mongoose';
import Reel from './models/Reel.model.js';
import Ad from './models/Ad.model.js';
import Comment from './models/Comment.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function heal() {
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Successfully connected to MongoDB');

  // 1. Heal Reels Comment Counts
  const reels = await Reel.find({});
  console.log(`Found ${reels.length} reels. Recalculating comment counts...`);
  
  let reelsUpdated = 0;
  for (const reel of reels) {
    const actualCommentsCount = await Comment.countDocuments({
      reel: reel._id,
      parentComment: null,
      isDeleted: false
    });

    const currentCommentsCount = reel.stats?.commentsCount ?? 0;

    if (currentCommentsCount !== actualCommentsCount) {
      console.log(`Reel ${reel._id}: stats.commentsCount is ${currentCommentsCount}, actual is ${actualCommentsCount}. Updating...`);
      await Reel.updateOne(
        { _id: reel._id },
        { $set: { 'stats.commentsCount': actualCommentsCount } }
      );
      reelsUpdated++;
    }
  }
  console.log(`Reels comments healing complete. Updated ${reelsUpdated} reels.\n`);

  // 2. Heal Ads Comment Counts
  const ads = await Ad.find({});
  console.log(`Found ${ads.length} ads. Recalculating comment counts...`);

  let adsUpdated = 0;
  for (const ad of ads) {
    const actualCommentsCount = await Comment.countDocuments({
      ad: ad._id,
      parentComment: null,
      isDeleted: false
    });

    const currentCommentsCount = ad.stats?.commentsCount ?? 0;

    if (currentCommentsCount !== actualCommentsCount) {
      console.log(`Ad ${ad._id}: stats.commentsCount is ${currentCommentsCount}, actual is ${actualCommentsCount}. Updating...`);
      await Ad.updateOne(
        { _id: ad._id },
        { $set: { 'stats.commentsCount': actualCommentsCount } }
      );
      adsUpdated++;
    }
  }
  console.log(`Ads comments healing complete. Updated ${adsUpdated} ads.\n`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB. Healing complete!');
}

heal().catch((err) => {
  console.error('Error during comments healing:', err);
  mongoose.disconnect().catch(() => {});
});
