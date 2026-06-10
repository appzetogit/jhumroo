import mongoose from 'mongoose';
import { getCategoriesFromHashtags } from '../utils/interestMapping.js';
import { convertToCdnUrl } from '../utils/s3.js';

const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    video: {
      url: {
        type: String,
        required: [true, 'Video URL is required']
      },
      publicId: {
        type: String,
        required: true
      },
      thumbnail: {
        type: String
      },
      duration: {
        type: Number, // in seconds
        required: true
      },
      width: Number,
      height: Number,
      format: String
    },
    caption: {
      type: String,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: ''
    },
    music: {
      name: {
        type: String,
        default: 'Original Sound'
      },
      url: String,
      artist: String,
      audioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Audio'
      },
      thumbnail: String,
      startTime: {
        type: Number,
        default: 0
      },
      duration: {
        type: Number,
        default: 15
      }
    },
    // Hashtags extracted from caption
    hashtags: [{
      type: String,
      lowercase: true
    }],
    // Mentions extracted from caption
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Categories for recommendation engine
    categories: [{
      type: String,
      lowercase: true,
      index: true
    }],
    // Location
    location: {
      name: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: '2dsphere'
        }
      }
    },
    // Geotargeting (multiple countries, and within those countries, specific states)
    targetLocations: [{
      country: {
        type: String,
        required: true
      },
      states: [{
        type: String
      }]
    }],
    // Privacy settings
    isPrivate: {
      type: Boolean,
      default: false
    },
    audience: {
      type: String,
      enum: ['everyone', 'followers', 'following'],
      default: 'everyone'
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    allowDownload: {
      type: Boolean,
      default: true
    },
    allowDuet: {
      type: Boolean,
      default: true
    },
    highQuality: {
      type: Boolean,
      default: true
    },
    saveToDevice: {
      type: Boolean,
      default: true
    },
    autoCaptions: {
      type: Boolean,
      default: true
    },
    captionLanguage: {
      type: String,
      default: 'English'
    },
    isAgeRestricted: {
      type: Boolean,
      default: false
    },
    // Streaming & Processing
    hlsUrl: String,
    rawVideoUrl: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    // Stats (denormalized for performance)
    stats: {
      likesCount: {
        type: Number,
        default: 0,
        min: 0
      },
      commentsCount: {
        type: Number,
        default: 0,
        min: 0
      },
      sharesCount: {
        type: Number,
        default: 0,
        min: 0
      },
      viewsCount: {
        type: Number,
        default: 0,
        min: 0
      },
      savesCount: {
        type: Number,
        default: 0,
        min: 0
      },
      totalWatchTime: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    // Engagement tracking
    views: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    // Editing metadata
    edits: {
      text: {
        content: String,
        font: String,
        color: String,
        fontSize: Number,
        position: {
          x: Number,
          y: Number
        },
        rotation: Number
      },
      stickers: [{
        content: String,
        position: {
          x: Number,
          y: Number
        },
        id: String
      }],
      filter: {
        type: String,
        default: 'Normal'
      }
    },
    isFlagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,
    // Remix & Sequence
    isRemix: {
      type: Boolean,
      default: false
    },
    originalReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      index: true
    },
    isSequence: {
      type: Boolean,
      default: false
    },
    previousReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      index: true
    },
    // AI Content
    isAiGenerated: {
      type: Boolean,
      default: false
    },
    aiInfo: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
        if (cdnDomain) {
          if (ret.video) {
            if (ret.video.publicId) {
              ret.video.url = `https://${cdnDomain}/${ret.video.publicId}`;
            } else if (ret.video.url) {
              ret.video.url = convertToCdnUrl(ret.video.url);
            }
            if (ret.video.thumbnail) {
              ret.video.thumbnail = convertToCdnUrl(ret.video.thumbnail);
            }
          }
          if (ret.rawVideoUrl) {
            ret.rawVideoUrl = convertToCdnUrl(ret.rawVideoUrl);
          }
          if (ret.music) {
            if (ret.music.url) {
              ret.music.url = convertToCdnUrl(ret.music.url);
            }
            if (ret.music.thumbnail) {
              ret.music.thumbnail = convertToCdnUrl(ret.music.thumbnail);
            }
          }
        }
        return ret;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
        if (cdnDomain) {
          if (ret.video) {
            if (ret.video.publicId) {
              ret.video.url = `https://${cdnDomain}/${ret.video.publicId}`;
            } else if (ret.video.url) {
              ret.video.url = convertToCdnUrl(ret.video.url);
            }
            if (ret.video.thumbnail) {
              ret.video.thumbnail = convertToCdnUrl(ret.video.thumbnail);
            }
          }
          if (ret.rawVideoUrl) {
            ret.rawVideoUrl = convertToCdnUrl(ret.rawVideoUrl);
          }
          if (ret.music) {
            if (ret.music.url) {
              ret.music.url = convertToCdnUrl(ret.music.url);
            }
            if (ret.music.thumbnail) {
              ret.music.thumbnail = convertToCdnUrl(ret.music.thumbnail);
            }
          }
        }
        return ret;
      }
    }
  }
);

// Indexes for performance
reelSchema.index({ user: 1, createdAt: -1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ 'stats.likesCount': -1 });
reelSchema.index({ 'stats.viewsCount': -1 });
reelSchema.index({ createdAt: -1 });

// Virtual populate for likes
reelSchema.virtual('likes', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'reel'
});

// Virtual populate for comments
reelSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'reel'
});

// Method to extract hashtags from caption
reelSchema.methods.extractHashtags = function () {
  const hashtagRegex = /#(\w+)/g;
  const matches = this.caption.match(hashtagRegex);
  if (matches) {
    this.hashtags = matches.map(tag => tag.slice(1).toLowerCase());
  }
};

// Method to extract mentions from caption
reelSchema.methods.extractMentions = async function () {
  const mentionRegex = /@(\w+)/g;
  const matches = this.caption.match(mentionRegex);
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

// Pre-save middleware to extract hashtags and mentions
reelSchema.pre('save', async function (next) {
  if (this.isModified('caption')) {
    this.extractHashtags();
    await this.extractMentions();
    this.categories = getCategoriesFromHashtags(this.hashtags);
  }
  next();
});

const Reel = mongoose.model('Reel', reelSchema);

export default Reel;