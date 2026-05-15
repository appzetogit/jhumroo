import mongoose from 'mongoose';

const staticPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    enum: ['terms-and-condition', 'privacy-policy']
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

const StaticPage = mongoose.model('StaticPage', staticPageSchema);

export default StaticPage;
