import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      default: ''
    },
    targetType: {
      type: String,
      enum: ['all', 'location'],
      default: 'all'
    },
    targetLocation: {
      country: {
        type: String,
        default: ''
      },
      state: {
        type: String,
        default: ''
      },
      district: {
        type: String,
        default: ''
      }
    },
    sentCount: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'scheduled'],
      default: 'sent'
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  { timestamps: true }
);

// TTL: MongoDB auto-deletes dispatch logs 3 days after createdAt.
adminNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;
