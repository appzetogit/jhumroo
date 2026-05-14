import mongoose from 'mongoose';

const savedReelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
      index: true
    },
    collection: {
      type: String,
      default: 'All Videos',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate saves
savedReelSchema.index({ user: 1, reel: 1 }, { unique: true });
savedReelSchema.index({ user: 1, collection: 1, createdAt: -1 });

// Update reel saves count
savedReelSchema.post('save', async function (doc) {
  const Reel = mongoose.model('Reel');
  await Reel.findByIdAndUpdate(doc.reel, {
    $inc: { 'stats.savesCount': 1 }
  });
});

// Update saves count on unsave
savedReelSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Reel = mongoose.model('Reel');
    await Reel.findByIdAndUpdate(doc.reel, {
      $inc: { 'stats.savesCount': -1 }
    });
  }
});

const SavedReel = mongoose.model('SavedReel', savedReelSchema);

export default SavedReel;
