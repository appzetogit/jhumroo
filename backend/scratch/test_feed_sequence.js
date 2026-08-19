import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Reel from '../models/Reel.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const GLOBAL_FEED_SEED = 789123;

const seededShuffle = (array, seed) => {
  const shuffled = [...array];
  let m = shuffled.length, t, i;
  let currentSeed = seed;
  
  const lcg = () => {
    currentSeed = (1103515245 * currentSeed + 12345) % 2147483648;
    return currentSeed / 2147483648;
  };

  while (m) {
    i = Math.floor(lcg() * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }
  return shuffled;
};

const isPhotoCandidate = (item) => {
  if (item.isPhoto || item.postType === 'photo') return true;
  if (item.video && item.video.type === 'image') return true;
  const url = item.video?.url || item.rawVideoUrl || '';
  if (url && (url.match(/\.(jpeg|jpg|png|webp)($|\?)/i) || url.includes('photo'))) return true;
  return false;
};

async function testFeedSequence() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log("No MONGODB_URI in env, skipping live DB test.");
      return;
    }
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const candidates = await Reel.find({ isActive: true, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    console.log(`Total candidate reels fetched: ${candidates.length}`);

    const videoCandidates = [];
    const photoCandidates = [];

    for (const candidate of candidates) {
      if (isPhotoCandidate(candidate)) {
        photoCandidates.push({ ...candidate, isPhoto: true, postType: 'photo' });
      } else {
        videoCandidates.push({ ...candidate, isPhoto: false, postType: 'video' });
      }
    }

    console.log(`Video Reels: ${videoCandidates.length}, Photo Posts: ${photoCandidates.length}`);

    // Perform 2 runs to test identical sequence guarantee
    const buildSequence = (seed) => {
      const shuffledVideos = seededShuffle(videoCandidates, seed);
      const shuffledPhotos = seededShuffle(photoCandidates, seed + 9999);

      const combined = [];
      let vIdx = 0, pIdx = 0;
      while (vIdx < shuffledVideos.length || pIdx < shuffledPhotos.length) {
        if (vIdx < shuffledVideos.length) combined.push(shuffledVideos[vIdx++]);
        if (vIdx < shuffledVideos.length) combined.push(shuffledVideos[vIdx++]);
        if (pIdx < shuffledPhotos.length) combined.push(shuffledPhotos[pIdx++]);

        if (vIdx >= shuffledVideos.length && pIdx < shuffledPhotos.length) {
          combined.push(shuffledPhotos[pIdx++]);
        } else if (pIdx >= shuffledPhotos.length && vIdx < shuffledVideos.length) {
          combined.push(shuffledVideos[vIdx++]);
        }
      }
      return combined;
    };

    const seq1 = buildSequence(GLOBAL_FEED_SEED);
    const seq2 = buildSequence(GLOBAL_FEED_SEED);

    const match = seq1.length === seq2.length && seq1.every((item, idx) => item._id.toString() === seq2[idx]._id.toString());
    console.log(`Sequence Identical Test: ${match ? 'PASSED ✅' : 'FAILED ❌'}`);

    console.log("\nFirst 10 items in feed sequence:");
    seq1.slice(0, 10).forEach((item, idx) => {
      console.log(`  [${idx + 1}] ID: ${item._id} | Type: ${item.postType || (item.isPhoto ? 'photo' : 'video')} | Caption: ${item.caption ? item.caption.slice(0, 30) : '(no caption)'}`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  } catch (err) {
    console.error("Error in test:", err);
    process.exit(1);
  }
}

testFeedSequence();
