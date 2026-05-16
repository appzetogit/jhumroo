import mongoose from 'mongoose';

const watchAnalyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
      index: true
    },
    watchDuration: {
      type: Number, // in seconds
      required: true
    },
    completionPercentage: {
      type: Number, // 0 to 100
      default: 0
    },
    replayCount: {
      type: Number,
      default: 0
    },
    isFullWatch: {
      type: Boolean,
      default: false
    },
    swipeTiming: {
      type: Number, // seconds since start
      default: 0
    },
    deviceInfo: {
      platform: String,
      appVersion: String
    }
  },
  { timestamps: true }
);

// Index for aggregation
watchAnalyticsSchema.index({ user: 1, reel: 1 });
watchAnalyticsSchema.index({ createdAt: -1 });

const WatchAnalytics = mongoose.model('WatchAnalytics', watchAnalyticsSchema);

export default WatchAnalytics;
