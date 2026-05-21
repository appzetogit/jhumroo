import mongoose from 'mongoose';
import Ad from './models/Ad.model.js';
import Like from './models/Like.model.js';
import Comment from './models/Comment.model.js';
import User from './models/User.model.js';
import Admin from './models/Admin.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  const populatedAds = await Ad.find({ isActive: true })
    .populate('user', 'username profilePicture isVerified')
    .lean();

  console.log('\n--- Populated Query (from reel.controller.js) ---');
  for (const ad of populatedAds) {
    console.log(`Ad ID: ${ad._id} | Caption: "${ad.caption}" | User Field Type: ${typeof ad.user} | User Field Value:`, ad.user);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
