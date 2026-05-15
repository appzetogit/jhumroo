import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportType: {
      type: String,
      enum: ['Reel', 'User', 'Comment'],
      required: true
    },
    reportedItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'reportType'
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'violence',
        'copyright',
        'fake_content',
        'adult_content',
        'other'
      ],
      required: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    reviewedAt: {
      type: Date
    },
    actionTaken: {
      type: String,
      enum: ['none', 'content_removed', 'user_warned', 'user_suspended', 'user_banned'],
      default: 'none'
    },
    adminNotes: {
      type: String,
      maxlength: 1000
    }
  },
  { timestamps: true }
);

// Indexes
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ reportType: 1, reportedItem: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ priority: 1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
