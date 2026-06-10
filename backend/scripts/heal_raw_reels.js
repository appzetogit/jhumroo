import mongoose from 'mongoose';
import Reel from '../models/Reel.model.js';
import { processReelWithAudio } from '../utils/videoProcessor.js';
import dotenv from 'dotenv';

dotenv.config();

const healReels = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all active completed reels where the video URL is raw webm/upload, or duration is 0
    const rawReels = await Reel.find({
      isActive: true,
      status: 'completed',
      $or: [
        { 'video.url': { $regex: /uploads\/raw/ } },
        { 'video.url': { $regex: /\.webm$/ } },
        { 'video.duration': 0 },
        { 'video.duration': null }
      ]
    });

    console.log(`Found ${rawReels.length} raw/unoptimized reels to process:`);
    for (const reel of rawReels) {
      console.log(`- ID: ${reel._id}, URL: ${reel.video?.url}, User: ${reel.user}`);
    }

    let healedCount = 0;
    for (const reel of rawReels) {
      const videoId = reel._id.toString();
      const rawKey = reel.video.publicId;

      console.log(`\n--------------------------------------------------`);
      console.log(`Processing Reel ID: ${videoId}`);
      console.log(`Raw S3 Key: ${rawKey}`);
      console.log(`Music Config:`, reel.music);

      try {
        const processed = await processReelWithAudio(reel._id, rawKey, reel.music);
        
        console.log(`[Heal] Process successful for ${videoId}`);
        
        await Reel.findByIdAndUpdate(reel._id, {
          'video.url': processed.videoUrl,
          'video.publicId': processed.videoKey,
          'video.thumbnail': processed.thumbnailUrl,
          'video.duration': processed.duration || 0,
        });

        console.log(`[Heal] Database updated for ${videoId}`);
        healedCount++;
      } catch (err) {
        console.error(`[Heal] Failed to process reel ${videoId}:`, err.message);
      }
    }

    console.log(`\n==================================================`);
    console.log(`Finished healing raw reels. Healed count: ${healedCount}/${rawReels.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

healReels();
