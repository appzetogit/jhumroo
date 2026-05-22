import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');

    const user = await User.findById('6a104e366a85cb7d1a16966c');
    if (!user) {
      console.log('User not found by _id. Trying to find by username "aman761" or phoneNumber "7974161582"...');
      const alternateUser = await User.findOne({ 
        $or: [
          { username: 'aman761' },
          { phoneNumber: '7974161582' }
        ]
      });
      if (alternateUser) {
        console.log('Found alternate user:', JSON.stringify(alternateUser, null, 2));
      } else {
        console.log('No user found at all with id/username/phone');
      }
    } else {
      console.log('Found User by ID:', JSON.stringify(user, null, 2));
    }
  } catch (err) {
    console.error('Error running check:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
