import mongoose from 'mongoose';

const adSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'onModel',
      index: true
    },
    onModel: {
      type: String,
      required: true,
      enum: ['User', 'Admin'],
      default: 'User'
    },
    media: {
      url: {
        type: String,
        required: [true, 'Media URL is required']
      },
      publicId: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['video', 'image'],
        required: true
      },
      thumbnail: String
    },
    caption: {
      type: String,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: ''
    },
    link: {
      type: String,
      trim: true
    },
    adType: {
      type: String,
      enum: ['chat', 'shop'],
      default: 'shop'
    },
    whatsappNumber: {
      type: String,
      trim: true
    },
    welcomeMessage: {
      type: String,
      trim: true
    },
    targetCountry: {
      type: String,
      default: 'India'
    },
    targetState: {
      type: [String],
      default: []
    },
    targetDistricts: {
      type: [String],
      default: []
    },
    music: {
      name: String,
      url: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    stats: {
      viewsCount: {
        type: Number,
        default: 0
      },
      clicksCount: {
        type: Number,
        default: 0
      },
      likesCount: {
        type: Number,
        default: 0
      },
      commentsCount: {
        type: Number,
        default: 0
      },
      savesCount: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
adSchema.index({ targetCountry: 1 });
adSchema.index({ targetState: 1 });
adSchema.index({ targetDistricts: 1 });
adSchema.index({ isActive: 1 });

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
