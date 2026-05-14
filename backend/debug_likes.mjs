import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to:', MONGODB_URI?.substring(0, 40) + '...');

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB\n');

// Use existing models by importing directly
const likeSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  reel: mongoose.Schema.Types.ObjectId,
  comment: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const reelSchema = new mongoose.Schema({
  caption: String,
  stats: {
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 }
  }
});

let LikeModel, ReelModel;
try {
  LikeModel = mongoose.model('Like');
} catch {
  LikeModel = mongoose.model('Like', likeSchema);
}
try {
  ReelModel = mongoose.model('Reel');
} catch {
  ReelModel = mongoose.model('Reel', reelSchema);
}

// Check total likes
const likeCount = await LikeModel.countDocuments({});
console.log('📊 Total Likes in DB:', likeCount);

// Sample likes with reel reference
const sampleLikes = await LikeModel.find({}).limit(5).lean();
console.log('\n🔍 Sample Likes:');
sampleLikes.forEach(l => console.log('  user:', l.user, '| reel:', l.reel));

// Check reels stats
const reels = await ReelModel.find({}).select('caption stats').limit(5).lean();
console.log('\n🎬 Reels Stats:');
reels.forEach(r => console.log('  id:', r._id, '| likesCount:', r.stats?.likesCount, '| caption:', r.caption?.substring(0, 30)));

// If there are likes but stats are 0, fix them
if (likeCount > 0) {
  console.log('\n🔧 Recalculating all reel like counts...');
  const allReels = await ReelModel.find({}).select('_id').lean();
  let fixed = 0;
  for (const reel of allReels) {
    const count = await LikeModel.countDocuments({ reel: reel._id });
    if (count > 0) {
      await ReelModel.updateOne({ _id: reel._id }, { $set: { 'stats.likesCount': count } });
      console.log(`  Fixed reel ${reel._id}: likesCount = ${count}`);
      fixed++;
    }
  }
  console.log(`\n✅ Fixed ${fixed} reels`);
} else {
  console.log('\nℹ️ No likes found in DB yet. Like count should update on first interaction.');
}

await mongoose.disconnect();
console.log('\nDone!');
process.exit(0);
