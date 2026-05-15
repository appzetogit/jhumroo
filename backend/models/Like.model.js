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
    ad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
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

// Validation: must have exactly one reference
likeSchema.pre('save', function (next) {
  const references = [this.reel, this.ad, this.comment].filter(Boolean);
  if (references.length === 0) {
    return next(new Error('Like must reference a reel, ad, or comment'));
  }
  if (references.length > 1) {
    return next(new Error('Like can only reference one item'));
  }
  next();
});

// Compound indexes to prevent duplicate likes
// Use partialFilterExpression to ensure uniqueness only when the field exists and is not null.
// This allows multiple likes where the other field is missing.
likeSchema.index(
  { user: 1, reel: 1 }, 
  { unique: true, partialFilterExpression: { reel: { $exists: true, $ne: null } } }
);
likeSchema.index(
  { user: 1, ad: 1 }, 
  { unique: true, partialFilterExpression: { ad: { $exists: true, $ne: null } } }
);
likeSchema.index(
  { user: 1, comment: 1 }, 
  { unique: true, partialFilterExpression: { comment: { $exists: true, $ne: null } } }
);

likeSchema.index({ reel: 1, createdAt: -1 });
likeSchema.index({ ad: 1, createdAt: -1 });
likeSchema.index({ comment: 1, createdAt: -1 });

// NOTE: Stats are updated directly in the controller (reel.controller.js → toggleLike)
// using countDocuments for absolute accuracy. No model-level hooks to avoid double updates.

const Like = mongoose.model('Like', likeSchema);

export default Like;
