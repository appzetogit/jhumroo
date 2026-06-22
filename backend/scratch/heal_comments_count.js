import mongoose from 'mongoose';
import Reel from '../models/Reel.model.js';
import Ad from '../models/Ad.model.js';
import Comment from '../models/Comment.model.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Repair Reels Comments Counts (top-level active comments only)
    const reels = await Reel.find({});
    console.log(`Processing ${reels.length} reels...`);
    for (const reel of reels) {
      const actualComments = await Comment.countDocuments({
        reel: reel._id,
        parentComment: null,
        isDeleted: false
      });
      const currentComments = reel.stats?.commentsCount || 0;
      if (currentComments !== actualComments) {
        console.log(`Reel ${reel._id} comments count mismatch: DB has ${currentComments}, actual is ${actualComments}. Updating...`);
        if (!reel.stats) reel.stats = {};
        reel.stats.commentsCount = actualComments;
        await reel.save({ validateBeforeSave: false });
      }
    }

    // 2. Repair Ads Comments Counts (top-level active comments only)
    const ads = await Ad.find({});
    console.log(`Processing ${ads.length} ads...`);
    for (const ad of ads) {
      const actualComments = await Comment.countDocuments({
        ad: ad._id,
        parentComment: null,
        isDeleted: false
      });
      const currentComments = ad.stats?.commentsCount || 0;
      if (currentComments !== actualComments) {
        console.log(`Ad ${ad._id} comments count mismatch: DB has ${currentComments}, actual is ${actualComments}. Updating...`);
        if (!ad.stats) ad.stats = {};
        ad.stats.commentsCount = actualComments;
        await ad.save({ validateBeforeSave: false });
      }
    }

    console.log('Comments count repair completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during repair:', error);
  }
};

run();
