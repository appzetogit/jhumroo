import mongoose from 'mongoose';

const liveStreamSchema = new mongoose.Schema(
  {
    broadcaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: 'Going Live on Jhumroo'
    },
    status: {
      type: String,
      enum: ['live', 'ended'],
      default: 'live',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    },
    currentViewersCount: {
      type: Number,
      default: 0
    },
    peakViewers: {
      type: Number,
      default: 0
    },
    totalUniqueViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    settings: {
      allowComments: {
        type: Boolean,
        default: true
      }
    }
  },
  { timestamps: true }
);

liveStreamSchema.index({ status: 1, startedAt: -1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);

export default LiveStream;
