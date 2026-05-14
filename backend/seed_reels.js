import mongoose from 'mongoose';
import Reel from './models/Reel.model.js';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedReels = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ phoneNumber: '7610416911' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    // Create a mock reel
    const reel = await Reel.create({
      user: user._id,
      video: {
        url: "https://res.cloudinary.com/demo/video/upload/c_fill,h_800,w_450/ski_jump.mp4",
        thumbnail: "https://res.cloudinary.com/demo/video/upload/c_fill,h_800,w_450/ski_jump.jpg",
        publicId: "ski_jump_id",
        duration: 15
      },
      caption: "This is my first end-to-end reel! 🚀 #jhumroo #test",
      music: {
        name: "Original Sound - " + user.username
      },
      stats: {
        likesCount: 125,
        viewsCount: 1500,
        sharesCount: 10
      }
    });

    console.log('Reel created:', reel._id);

    // Update user stats
    user.stats.reelsCount = (user.stats.reelsCount || 0) + 1;
    await user.save();

    console.log('User stats updated');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedReels();
