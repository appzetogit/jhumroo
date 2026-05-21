import mongoose from 'mongoose';
import Reel from '../models/Reel.model.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const reels = await Reel.find({}).lean();
    console.log('Reels Detail:', JSON.stringify(reels, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
