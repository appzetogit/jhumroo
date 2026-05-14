import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
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
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      index: true
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Validation: must have either reel or comment (not both)
likeSchema.pre('save', function (next) {
  if (!this.reel && !this.comment) {
    return next(new Error('Like must reference either a reel or a comment'));
  }
  if (this.reel && this.comment) {
    return next(new Error('Like cannot reference both reel and comment'));
  }
  next();
});

// Compound indexes to prevent duplicate likes
likeSchema.index({ user: 1, reel: 1 }, { unique: true });
likeSchema.index({ user: 1, comment: 1 }, { unique: true });
likeSchema.index({ reel: 1, createdAt: -1 });
likeSchema.index({ comment: 1, createdAt: -1 });

// NOTE: Stats are updated directly in the controller (reel.controller.js → toggleLike)
// using countDocuments for absolute accuracy. No model-level hooks to avoid double updates.

const Like = mongoose.model('Like', likeSchema);

export default Like;
