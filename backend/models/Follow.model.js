import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'accepted' // 'pending' for private accounts
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

// Compound index to prevent duplicate follows and improve query performance
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });
followSchema.index({ follower: 1, createdAt: -1 });

// Prevent users from following themselves
followSchema.pre('save', function (next) {
  if (this.follower.equals(this.following)) {
    next(new Error('Users cannot follow themselves'));
  } else {
    next();
  }
});

// Update user stats on follow
followSchema.post('save', async function (doc) {
  if (doc.status !== 'accepted') return;
  
  const User = mongoose.model('User');
  
  // Increment follower count for the user being followed
  await User.findByIdAndUpdate(doc.following, {
    $inc: { 'stats.followersCount': 1 }
  });
  
  // Increment following count for the follower
  await User.findByIdAndUpdate(doc.follower, {
    $inc: { 'stats.followingCount': 1 }
  });
});

// Update user stats on unfollow
followSchema.post('findOneAndDelete', async function (doc) {
  if (doc && doc.status === 'accepted') {
    const User = mongoose.model('User');
    
    // Decrement follower count
    await User.findByIdAndUpdate(doc.following, {
      $inc: { 'stats.followersCount': -1 }
    });
    
    // Decrement following count
    await User.findByIdAndUpdate(doc.follower, {
      $inc: { 'stats.followingCount': -1 }
    });
  }
});

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
