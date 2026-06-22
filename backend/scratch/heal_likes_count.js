import mongoose from 'mongoose';
import Reel from '../models/Reel.model.js';
import Ad from '../models/Ad.model.js';
import Like from '../models/Like.model.js';
import User from '../models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Repair Reels Likes Counts
    const reels = await Reel.find({});
    console.log(`Processing ${reels.length} reels...`);
    for (const reel of reels) {
      const actualLikes = await Like.countDocuments({ reel: reel._id });
      if (reel.stats.likesCount !== actualLikes) {
        console.log(`Reel ${reel._id} likes count mismatch: DB has ${reel.stats.likesCount}, actual is ${actualLikes}. Updating...`);
        reel.stats.likesCount = actualLikes;
        await reel.save({ validateBeforeSave: false });
      }
    }

    // 2. Repair Ads Likes Counts
    const ads = await Ad.find({});
    console.log(`Processing ${ads.length} ads...`);
    for (const ad of ads) {
      const actualLikes = await Like.countDocuments({ ad: ad._id });
      const currentLikes = ad.stats?.likesCount || 0;
      if (currentLikes !== actualLikes) {
        console.log(`Ad ${ad._id} likes count mismatch: DB has ${currentLikes}, actual is ${actualLikes}. Updating...`);
        if (!ad.stats) ad.stats = {};
        ad.stats.likesCount = actualLikes;
        await ad.save({ validateBeforeSave: false });
      }
    }

    // 3. Repair Users Total Likes Counts
    const users = await User.find({});
    console.log(`Processing ${users.length} users...`);
    for (const user of users) {
      const userReels = await Reel.find({ user: user._id });
      const totalLikes = userReels.reduce((sum, r) => sum + (r.stats?.likesCount || 0), 0);
      if (user.stats.likesCount !== totalLikes) {
        console.log(`User ${user.username} likes count mismatch: DB has ${user.stats.likesCount}, actual is ${totalLikes}. Updating...`);
        user.stats.likesCount = totalLikes;
        await user.save({ validateBeforeSave: false });
      }
    }

    console.log('Likes repair completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during repair:', error);
  }
};

run();
