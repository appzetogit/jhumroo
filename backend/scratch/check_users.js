import mongoose from 'mongoose';
import User from '../models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const totalUsers = await User.countDocuments();
    console.log(`Total users in DB: ${totalUsers}`);

    const sampleUsers = await User.find()
      .select('username fullName stats')
      .limit(10);
    console.log('Sample Users:');
    console.log(JSON.stringify(sampleUsers, null, 2));

    const topUsers = await User.find()
      .select('username fullName profilePicture stats.reelsCount isVerified')
      .sort({ 'stats.reelsCount': -1 })
      .limit(5);
    console.log('Top Users Query Result:');
    console.log(JSON.stringify(topUsers, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

run();
