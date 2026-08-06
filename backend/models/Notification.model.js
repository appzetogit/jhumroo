import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
      // Not required - system notifications (e.g. report status updates) have no user sender.
    },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'follow_request', 'follow_accept', 'follow_back', 'mention', 'remix', 'sequence', 'message', 'report_status'],
      required: true
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel'
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    },
    text: {
      type: String
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
