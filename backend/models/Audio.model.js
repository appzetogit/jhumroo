import mongoose from 'mongoose';

const audioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Audio title is required'],
      trim: true
    },
    artist: {
      type: String,
      default: 'Original Audio',
      trim: true
    },
    url: {
      type: String,
      required: [true, 'Audio URL is required']
    },
    thumbnail: {
      type: String,
      default: ''
    },
    duration: {
      type: Number,
      default: 0
    },
    category: {
      type: String,
      default: 'Trending'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Audio = mongoose.model('Audio', audioSchema);

export default Audio;
