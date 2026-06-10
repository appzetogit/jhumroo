import mongoose from 'mongoose';
import { processReelWithAudio } from '../utils/videoProcessor.js';
import Reel from '../models/Reel.model.js';
import dotenv from 'dotenv';

dotenv.config();

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const reelId = '6a1550246b03e69f1d6dfc38';
    const key = 'uploads/raw/6a1545e777778b304ed50e3a/6a1550246b03e69f1d6dfc38-jhumroo_reel_1779781668717.webm';
    
    const reel = await Reel.findById(reelId);
    if (!reel) {
      console.error('Reel not found');
      process.exit(1);
    }

    console.log('Testing processReelWithAudio for Reel:', reelId);
    console.log('Music Config:', reel.music);

    const result = await processReelWithAudio(reelId, key, reel.music);
    console.log('Processing SUCCESS!');
    console.log('Result:', result);

    process.exit(0);
  } catch (error) {
    console.error('Processing FAILED with error:');
    console.error(error);
    process.exit(1);
  }
};

runTest();
