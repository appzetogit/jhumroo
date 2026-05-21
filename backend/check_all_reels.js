import mongoose from 'mongoose';
import User from './models/User.model.js';
import Reel from './models/Reel.model.js';
import dotenv from 'dotenv';

dotenv.config();

const checkAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const reels = await Reel.find().populate('user', 'username').lean();
    console.log(`Found ${reels.length} reels in total:`);
    reels.forEach((r, idx) => {
      console.log(`\nReel #${idx + 1}:`);
      console.log(`ID: ${r._id}`);
      console.log(`User: ${r.user?.username}`);
      console.log(`Status: ${r.status}`);
      console.log(`Video URL: ${r.video?.url}`);
      console.log(`Duration: ${r.video?.duration}`);
      console.log(`Format: ${r.video?.format}`);
      console.log(`isActive: ${r.isActive}`);
      console.log(`music:`, r.music);
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkAll();
