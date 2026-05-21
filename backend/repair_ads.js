import mongoose from 'mongoose';
import Ad from './models/Ad.model.js';
import User from './models/User.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  // Find all ads that have onModel = 'Admin'
  const ads = await Ad.find({ onModel: 'Admin' });
  console.log(`Found ${ads.length} ads with onModel: 'Admin'`);
  
  for (const ad of ads) {
    // Check if the user ID belongs to a regular User
    const userExists = await User.exists({ _id: ad.user });
    if (userExists) {
      console.log(`Repairing Ad ${ad._id} ("${ad.caption}"): Changing onModel from 'Admin' to 'User'`);
      ad.onModel = 'User';
      await ad.save();
    } else {
      console.log(`Ad ${ad._id} ("${ad.caption}") is a valid Admin ad or creator does not exist in User collection.`);
    }
  }
  
  console.log('Ad repair complete!');
  await mongoose.disconnect();
}

run().catch(console.error);
