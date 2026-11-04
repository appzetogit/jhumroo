import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    countryCode: {
      type: String,
      default: '+1'
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores'],
      validate: {
        validator: function(v) {
          return /[0-9._]/.test(v);
        },
        message: 'Username must contain at least one number or special character (e.g. . or _)'
      },
      index: true
    },
    email: {
      type: String,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [50, 'Full name cannot exceed 50 characters']
    },
    bio: {
      type: String,
      maxlength: [150, 'Bio cannot exceed 150 characters'],
      default: ''
    },
    profilePicture: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    dateOfBirth: {
      type: Date
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    // Premium Subscription
    isPremium: {
      type: Boolean,
      default: false,
      index: true
    },
    premiumExpiresAt: {
      type: Date,
      default: null
    },
    premiumPlan: {
      type: String,
      default: 'monthly'
    },
    // Social Links
    socialLinks: {
      instagram: String,
      youtube: String,
      twitter: String
    },
    // Stats (denormalized for performance)
    stats: {
      followersCount: {
        type: Number,
        default: 0,
        min: 0
      },
      followingCount: {
        type: Number,
        default: 0,
        min: 0
      },
      likesCount: {
        type: Number,
        default: 0,
        min: 0
      },
      reelsCount: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    // OTP for authentication
    otp: {
      code: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 }
    },
    // Device tokens for push notifications
    deviceTokens: [{
      token: String,
      platform: {
        type: String,
        enum: ['ios', 'android', 'web']
      }
    }],
    fcmTokenMobile: {
      type: String,
      default: ''
    },
    fcmToken: {
      type: String,
      default: ''
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    banReason: {
      type: String
    },
    bannedAt: {
      type: Date
    },
    banExpiresAt: {
      type: Date
    },
    lastLoginAt: {
      type: Date
    },
    lastActive: {
      type: Date
    },
    refreshToken: {
      type: String
    },
    refreshTokens: [{
      token: {
        type: String,
        required: true
      },
      expiresAt: {
        type: Date,
        required: true
      },
      graceExpiresAt: {
        type: Date
      }
    }],
    country: {
      type: String,
      default: 'India'
    },
    state: {
      type: String
    },
    district: {
      type: String
    },
    interests: {
      type: [String],
      default: []
    },
    isLive: {
      type: Boolean,
      default: false
    },
    isOnboarded: {
      type: Boolean,
      default: false
    },
    savedAudios: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Audio'
    }],
    commentPrivacy: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'everyone'
    },
    mentionPrivacy: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'everyone'
    },
    messagePrivacy: {
      type: String,
      enum: ['everyone', 'friends', 'no_one'],
      default: 'everyone'
    },
    downloadPrivacy: {
      type: String,
      enum: ['On', 'Off'],
      default: 'On'
    },
    activeStatusPrivacy: {
      type: String,
      enum: ['public', 'friends', 'no_one'],
      default: 'friends'
    },
    notificationSettings: {
      likes: {
        type: Boolean,
        default: true
      },
      comments: {
        type: Boolean,
        default: true
      },
      newFollowers: {
        type: Boolean,
        default: true
      },
      mentionsAndTags: {
        type: Boolean,
        default: true
      }
    },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    blockedCommenters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    liveLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.followersCount': -1 });
userSchema.index({ liveLocation: '2dsphere' });
userSchema.index({ blockedUsers: 1 }); // "who blocked me" lookup on every feed/reel request

// Virtual for full phone number
userSchema.virtual('fullPhoneNumber').get(function () {
  return `${this.countryCode}${this.phoneNumber}`;
});

// Virtual for profile completeness check
userSchema.virtual('isProfileCompleted').get(function () {
  return !!(this.username && !this.username.startsWith('user_') && this.fullName);
});


// Method to generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000)
  };
  return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function (code) {
  if (!this.otp || !this.otp.code) {
    return false;
  }
  if (this.otp.expiresAt < new Date()) {
    return false;
  }
  if (this.otp.code === String(code)) return true;
  // Burn the OTP after 5 wrong guesses so it can't be brute-forced. Caller must save().
  this.otp.attempts = (this.otp.attempts || 0) + 1;
  if (this.otp.attempts >= 5) this.otp = undefined;
  return false;
};

/** True if either user has blocked the other. */
userSchema.statics.isBlockedBetween = async function (a, b) {
  if (!a || !b) return false;
  return !!(await this.exists({ $or: [{ _id: a, blockedUsers: b }, { _id: b, blockedUsers: a }] }));
};

// Method to clear OTP
userSchema.methods.clearOTP = function () {
  this.otp = undefined;
};

// Remove sensitive data from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp;
  delete obj.deviceTokens;
  // Session/push secrets and live GPS never leave the server in any response.
  delete obj.refreshToken;
  delete obj.refreshTokens;
  delete obj.fcmToken;
  delete obj.fcmTokenMobile;
  delete obj.liveLocation;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
