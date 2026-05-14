import mongoose from 'mongoose';

const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    // Interested topics/hashtags with weights
    interestVectors: {
      type: Map,
      of: Number, // topic/hashtag -> weight
      default: {}
    },
    // Disliked topics/hashtags
    dislikedTopics: [{
      type: String,
      lowercase: true
    }],
    // Disliked creators
    dislikedCreators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Content settings
    sensitiveContent: {
      type: String,
      enum: ['standard', 'less', 'more'],
      default: 'standard'
    },
    languagePreferences: [{
      type: String,
      default: ['English']
    }],
    aiContentVisibility: {
      type: Boolean,
      default: true
    },
    autoPlay: {
      type: Boolean,
      default: true
    },
    autoScroll: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

export default UserPreference;
