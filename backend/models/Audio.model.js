import mongoose from 'mongoose';
import { convertToCdnUrl } from '../utils/s3.js';

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
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        if (ret.url) {
          ret.url = convertToCdnUrl(ret.url);
        }
        if (ret.thumbnail) {
          ret.thumbnail = convertToCdnUrl(ret.thumbnail);
        }
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function(doc, ret) {
        if (ret.url) {
          ret.url = convertToCdnUrl(ret.url);
        }
        if (ret.thumbnail) {
          ret.thumbnail = convertToCdnUrl(ret.thumbnail);
        }
        return ret;
      }
    }
  }
);

const Audio = mongoose.model('Audio', audioSchema);

export default Audio;
