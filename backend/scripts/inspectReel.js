import mongoose from 'mongoose';
import Reel from './backend/models/Reel.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const reel = await Reel.findOne().sort({ createdAt: -1 });
  console.log('REEL DATA:', JSON.stringify(reel, null, 2));
  process.exit();
}

check();
