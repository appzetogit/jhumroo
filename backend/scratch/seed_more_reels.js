import mongoose from 'mongoose';
import Reel from '../models/Reel.model.js';
import User from '../models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ phoneNumber: '7610416911' });
    if (!user) {
      console.log('User ajaypanchal761 not found');
      process.exit(1);
    }

    const mockReels = [
      {
        user: user._id,
        video: {
          url: "https://dnhfcri4f3jis.cloudfront.net/reels/processed/6a0c62da277587f25f545164/1779196644619-final_video.mp4",
          publicId: "reels/processed/seed1",
          duration: 16.2,
          thumbnail: "https://dnhfcri4f3jis.cloudfront.net/reels/thumbnails/6a0c62da277587f25f545164/1779196644620-thumbnail.jpg"
        },
        caption: "Beautiful nature and mountains 🏔️ #nature #mountains",
        music: {
          name: "Original Sound"
        },
        status: "completed",
        isActive: true,
        stats: {
          likesCount: 5,
          viewsCount: 120,
          sharesCount: 2,
          commentsCount: 1
        }
      },
      {
        user: user._id,
        video: {
          url: "https://dnhfcri4f3jis.cloudfront.net/reels/processed/6a0c62da277587f25f545164/1779196644619-final_video.mp4",
          publicId: "reels/processed/seed2",
          duration: 16.2,
          thumbnail: "https://dnhfcri4f3jis.cloudfront.net/reels/thumbnails/6a0c62da277587f25f545164/1779196644620-thumbnail.jpg"
        },
        caption: "Adventure of a lifetime! 🌲🚴‍♂️ #adventure #riding",
        music: {
          name: "Original Sound"
        },
        status: "completed",
        isActive: true,
        stats: {
          likesCount: 12,
          viewsCount: 250,
          sharesCount: 4,
          commentsCount: 2
        }
      },
      {
        user: user._id,
        video: {
          url: "https://dnhfcri4f3jis.cloudfront.net/reels/processed/6a0c62da277587f25f545164/1779196644619-final_video.mp4",
          publicId: "reels/processed/seed3",
          duration: 16.2,
          thumbnail: "https://dnhfcri4f3jis.cloudfront.net/reels/thumbnails/6a0c62da277587f25f545164/1779196644620-thumbnail.jpg"
        },
        caption: "Coding all night long 💻🚀 #developer #workspace",
        music: {
          name: "Original Sound"
        },
        status: "completed",
        isActive: true,
        stats: {
          likesCount: 18,
          viewsCount: 410,
          sharesCount: 11,
          commentsCount: 5
        }
      }
    ];

    const inserted = await Reel.insertMany(mockReels);
    console.log(`Successfully seeded ${inserted.length} completed reels!`);

    user.stats.reelsCount = (user.stats.reelsCount || 0) + inserted.length;
    await user.save();
    console.log('Updated user reels count in profile');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
