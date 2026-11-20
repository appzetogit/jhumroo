import mongoose from 'mongoose';

// One row per (profile, visitor, day): repeat visits on the same day count once.
// Feeds "Profile visits" on the premium dashboard; rows expire after 180 days (2 × the longest 90-day range).
const profileVisitSchema = new mongoose.Schema({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true }, // YYYY-MM-DD (UTC)
  createdAt: { type: Date, default: Date.now }
});

profileVisitSchema.index({ profile: 1, visitor: 1, day: 1 }, { unique: true });
profileVisitSchema.index({ profile: 1, createdAt: -1 });
profileVisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86400 });

export default mongoose.model('ProfileVisit', profileVisitSchema);
