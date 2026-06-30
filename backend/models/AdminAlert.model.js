import mongoose from 'mongoose';

const adminAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['new_reel', 'new_report', 'new_support', 'new_ad'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const AdminAlert = mongoose.model('AdminAlert', adminAlertSchema);

export default AdminAlert;
