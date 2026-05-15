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
      index: true
    },
    ad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
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
savedReelSchema.index(
  { user: 1, reel: 1 }, 
  { unique: true, partialFilterExpression: { reel: { $exists: true, $ne: null } } }
);
savedReelSchema.index(
  { user: 1, ad: 1 }, 
  { unique: true, partialFilterExpression: { ad: { $exists: true, $ne: null } } }
);
savedReelSchema.index({ user: 1, collection: 1, createdAt: -1 });

// Update stats count
savedReelSchema.post('save', async function (doc) {
  if (doc.reel) {
    const Reel = mongoose.model('Reel');
    await Reel.findByIdAndUpdate(doc.reel, { $inc: { 'stats.savesCount': 1 } });
  } else if (doc.ad) {
    const Ad = mongoose.model('Ad');
    await Ad.findByIdAndUpdate(doc.ad, { $inc: { 'stats.savesCount': 1 } });
  }
});

// Update counts on unsave
savedReelSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    if (doc.reel) {
      const Reel = mongoose.model('Reel');
      await Reel.findByIdAndUpdate(doc.reel, { $inc: { 'stats.savesCount': -1 } });
    } else if (doc.ad) {
      const Ad = mongoose.model('Ad');
      await Ad.findByIdAndUpdate(doc.ad, { $inc: { 'stats.savesCount': -1 } });
    }
  }
});

const SavedReel = mongoose.model('SavedReel', savedReelSchema);

export default SavedReel;
