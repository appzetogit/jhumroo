import UserPreference from '../../../models/UserPreference.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

/**
 * @desc    Get user preferences
 * @route   GET /api/users/preferences
 * @access  Private
 */
export const getPreferences = asyncHandler(async (req, res) => {
  let preferences = await UserPreference.findOne({ user: req.user._id });
  
  if (!preferences) {
    preferences = await UserPreference.create({ user: req.user._id });
  }

  res.status(200).json({
    success: true,
    preferences
  });
});

/**
 * @desc    Update user preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { sensitiveContent, languagePreferences, aiContentVisibility, autoPlay, autoScroll } = req.body;
  
  const preferences = await UserPreference.findOneAndUpdate(
    { user: req.user._id },
    { 
      sensitiveContent, 
      languagePreferences, 
      aiContentVisibility, 
      autoPlay, 
      autoScroll 
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    preferences
  });
});

/**
 * @desc    Mark content as not interested
 * @route   POST /api/users/preferences/not-interested
 * @access  Private
 */
export const markNotInterested = asyncHandler(async (req, res) => {
  const { reelId, creatorId, topics } = req.body;
  
  const update = {
    $addToSet: {}
  };
  
  if (creatorId) {
    update.$addToSet.dislikedCreators = creatorId;
  }
  
  if (topics && Array.isArray(topics)) {
    update.$addToSet.dislikedTopics = { $each: topics };
  }

  const preferences = await UserPreference.findOneAndUpdate(
    { user: req.user._id },
    update,
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    message: 'We will show you less content like this',
    preferences
  });
});

/**
 * @desc    Update interest vectors (Interested)
 * @route   POST /api/users/preferences/interested
 * @access  Private
 */
export const markInterested = asyncHandler(async (req, res) => {
  const { topics } = req.body;
  
  const preferences = await UserPreference.findOne({ user: req.user._id });
  
  if (preferences) {
    topics.forEach(topic => {
      const currentWeight = preferences.interestVectors.get(topic) || 0;
      preferences.interestVectors.set(topic, currentWeight + 1);
    });
    await preferences.save();
  } else {
    const interestMap = new Map();
    topics.forEach(topic => interestMap.set(topic, 1));
    await UserPreference.create({
      user: req.user._id,
      interestVectors: interestMap
    });
  }

  res.status(200).json({
    success: true,
    message: 'Interest recorded'
  });
});
