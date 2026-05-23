import mongoose from 'mongoose';
import Reel from '../models/Reel.model.js';
import dotenv from 'dotenv';

dotenv.config();

const repair = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const fallbackThumbnail = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop';

    // Find all reels with status: 'failed'
    const failedReels = await Reel.find({ status: 'failed' });
    console.log(`Found ${failedReels.length} failed reels to repair.`);

    let repairedCount = 0;
    for (const reel of failedReels) {
      console.log(`Repairing Reel ID: ${reel._id}`);
      
      const updateData = {
        status: 'completed'
      };

      // Set raw video URL if it was raw, or keep current URL
      if (reel.rawVideoUrl) {
        updateData['video.url'] = reel.rawVideoUrl;
      }

      // If no thumbnail or thumbnail is empty/broken, set fallback
      if (!reel.video?.thumbnail || reel.video.thumbnail === '') {
        updateData['video.thumbnail'] = fallbackThumbnail;
      }

      await Reel.findByIdAndUpdate(reel._id, updateData);
      repairedCount++;
    }

    console.log(`Successfully repaired ${repairedCount} reels.`);
    process.exit(0);
  } catch (error) {
    console.error('Repair failed:', error);
    process.exit(1);
  }
};

repair();
