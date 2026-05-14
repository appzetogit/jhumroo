import mongoose from 'mongoose';
import Reel from './models/Reel.model.js';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const reelCount = await Reel.countDocuments();
    console.log('Total Reels:', reelCount);

    const users = await User.find({ phoneNumber: '7610416911' });
    console.log('Test User:', users.length > 0 ? users[0].username : 'Not found');

    if (users.length > 0) {
        const userReels = await Reel.find({ user: users[0]._id });
        console.log('User Reels:', userReels.length);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkData();
