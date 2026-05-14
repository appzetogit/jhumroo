import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
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
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      trim: true
    },
    // For reply functionality
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    // Stats
    likesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    repliesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Status
    isEdited: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
commentSchema.index({ reel: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });

// Update reel comment count
commentSchema.post('save', async function (doc) {
  if (!doc.parentComment) {
    const Reel = mongoose.model('Reel');
    await Reel.findByIdAndUpdate(doc.reel, {
      $inc: { 'stats.commentsCount': 1 }
    });
  } else {
    // Update parent comment reply count
    await mongoose.model('Comment').findByIdAndUpdate(doc.parentComment, {
      $inc: { repliesCount: 1 }
    });
  }
});

// Update counts on delete
commentSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && doc.isDeleted) {
    if (!doc.parentComment) {
      const Reel = mongoose.model('Reel');
      await Reel.findByIdAndUpdate(doc.reel, {
        $inc: { 'stats.commentsCount': -1 }
      });
    } else {
      await mongoose.model('Comment').findByIdAndUpdate(doc.parentComment, {
        $inc: { repliesCount: -1 }
      });
    }
  }
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
