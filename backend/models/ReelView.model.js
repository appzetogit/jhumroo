import mongoose from 'mongoose';

// One row per (reel, user): the unique index makes "count each viewer once" an atomic insert,
// instead of an ever-growing views[] array inside every Reel document.
const reelViewSchema = new mongoose.Schema({
  reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now }
});

reelViewSchema.index({ reel: 1, user: 1 }, { unique: true });

const ReelView = mongoose.model('ReelView', reelViewSchema);

export default ReelView;
