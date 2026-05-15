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
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

// Method to extract mentions from text
commentSchema.methods.extractMentions = async function () {
  const mentionRegex = /@(\w+)/g;
  const matches = this.text.match(mentionRegex);
  if (matches) {
    const usernames = matches.map(mention => mention.slice(1).toLowerCase());
    const User = mongoose.model('User');
    const Follow = mongoose.model('Follow');
    
    // Find all potential users being mentioned
    const users = await User.find({ username: { $in: usernames } }).select('_id mentionPrivacy');
    
    const validMentions = [];
    for (const targetUser of users) {
      const privacy = targetUser.mentionPrivacy || 'everyone';
      
      if (privacy === 'everyone') {
        validMentions.push(targetUser._id);
      } else if (privacy === 'friends') {
        // Friends means mutual followers
        const [followA, followB] = await Promise.all([
          Follow.findOne({ follower: this.user, following: targetUser._id, status: 'accepted' }),
          Follow.findOne({ follower: targetUser._id, following: this.user, status: 'accepted' })
        ]);
        
        if (followA && followB) {
          validMentions.push(targetUser._id);
        }
      }
      // If 'no_one', we don't add to validMentions
    }
    
    this.mentions = validMentions;
  } else {
    this.mentions = [];
  }
};

// Pre-save middleware to extract mentions
commentSchema.pre('save', async function (next) {
  if (this.isModified('text')) {
    await this.extractMentions();
  }
  next();
});

// Indexes
commentSchema.index({ reel: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });

// Update reel comment count & replies count
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
