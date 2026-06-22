import Audio from '../../../models/Audio.model.js';
import Reel from '../../../models/Reel.model.js';
import User from '../../../models/User.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { uploadToS3 } from '../../../utils/s3.js';
import fs from 'fs';

/**
 * @desc    Get all active audios
 * @route   GET /api/audios
 * @access  Public
 */
export const getAudios = asyncHandler(async (req, res) => {
  const { category, q } = req.query;
  const query = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (q) {
    query.title = { $regex: q, $options: 'i' };
  }

  const audios = await Audio.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'reels',
        localField: '_id',
        foreignField: 'music.audioId',
        as: 'usageInfo'
      }
    },
    {
      $addFields: {
        usageCount: { $size: '$usageInfo' }
      }
    },
    { $project: { usageInfo: 0 } },
    { $sort: { createdAt: -1 } }
  ]);

  // If user is authenticated, mark saved audios
  let userSavedIds = [];
  if (req.user) {
    const user = await User.findById(req.user._id);
    userSavedIds = user.savedAudios.map(id => id.toString());
  }

  const audiosWithSavedStatus = audios.map(audio => ({
    ...audio,
    isSaved: userSavedIds.includes(audio._id.toString())
  }));

  res.status(200).json({
    success: true,
    count: audios.length,
    audios: audiosWithSavedStatus
  });
});

/**
 * @desc    Get single audio by ID
 * @route   GET /api/audios/:id
 * @access  Public
 */
export const getAudioById = asyncHandler(async (req, res) => {
  const audio = await Audio.findById(req.params.id);

  if (!audio) {
    return res.status(404).json({
      success: false,
      message: 'Audio not found'
    });
  }

  res.status(200).json({
    success: true,
    audio
  });
});

/**
 * @desc    Create new audio (Admin)
 * @route   POST /api/audios
 * @access  Private/Admin
 */
export const createAudio = asyncHandler(async (req, res) => {
  console.log('--- Create Audio Request ---');
  console.log('Body:', req.body);
  const { title, artist, duration, category } = req.body;
  let { url: audioUrl, thumbnail: thumbnailUrl } = req.body;

  // Handle file uploads to S3
  if (req.files) {
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');
    if (req.files.audio && req.files.audio[0]) {
      const audioFile = req.files.audio[0];
      console.log('Uploading audio to S3:', audioFile.path);
      try {
        const s3Result = await uploadToS3(audioFile.path, 'audios', audioFile.mimetype);
        audioUrl = s3Result.url;
        console.log('Audio uploaded successfully:', audioUrl);
      } catch (error) {
        console.error('Audio upload failed:', error);
        throw error;
      }
      // Delete local temp file
      if (fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path);
    }

    if (req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbFile = req.files.thumbnail[0];
      console.log('Uploading thumbnail to S3:', thumbFile.path);
      try {
        const s3Result = await uploadToS3(thumbFile.path, 'audios/thumbnails', thumbFile.mimetype);
        thumbnailUrl = s3Result.url;
        console.log('Thumbnail uploaded successfully:', thumbnailUrl);
      } catch (error) {
        console.error('Thumbnail upload failed:', error);
        throw error;
      }
      // Delete local temp file
      if (fs.existsSync(thumbFile.path)) fs.unlinkSync(thumbFile.path);
    }
  } else {
    console.log('No files received in request');
  }

  if (!audioUrl) {
    return res.status(400).json({
      success: false,
      message: 'Audio file or URL is required'
    });
  }

  const audio = await Audio.create({
    title,
    artist,
    url: audioUrl,
    thumbnail: thumbnailUrl,
    duration: duration || 0,
    category: category || 'Trending'
  });

  res.status(201).json({
    success: true,
    message: 'Audio created successfully',
    audio
  });
});

/**
 * @desc    Update audio (Admin)
 * @route   PUT /api/audios/:id
 * @access  Private/Admin
 */
export const updateAudio = asyncHandler(async (req, res) => {
  let updateData = { ...req.body };

  // Handle optional thumbnail update
  if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
    const thumbFile = req.files.thumbnail[0];
    console.log('Updating thumbnail in S3:', thumbFile.path);
    try {
      const s3Result = await uploadToS3(thumbFile.path, 'audios/thumbnails', thumbFile.mimetype);
      updateData.thumbnail = s3Result.url;
      console.log('New thumbnail uploaded:', updateData.thumbnail);
    } catch (error) {
      console.error('Thumbnail update failed:', error);
      throw error;
    } finally {
      // Delete local temp file
      if (fs.existsSync(thumbFile.path)) fs.unlinkSync(thumbFile.path);
    }
  }

  const audio = await Audio.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  if (!audio) {
    return res.status(404).json({
      success: false,
      message: 'Audio not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Audio updated successfully',
    audio
  });
});

/**
 * @desc    Delete audio (Admin)
 * @route   DELETE /api/audios/:id
 * @access  Private/Admin
 */
export const deleteAudio = asyncHandler(async (req, res) => {
  const audio = await Audio.findByIdAndDelete(req.params.id);

  if (!audio) {
    return res.status(404).json({
      success: false,
      message: 'Audio not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Audio deleted successfully'
  });
});

/**
 * @desc    Toggle save audio for current user
 * @route   POST /api/audios/:id/save
 * @access  Private
 */
export const toggleSaveAudio = asyncHandler(async (req, res) => {
  console.log('--- toggleSaveAudio ---');
  console.log('User:', req.user?._id);
  console.log('Audio ID:', req.params.id);

  const user = await User.findById(req.user._id);
  const audioId = req.params.id;

  const audio = await Audio.findById(audioId);
  if (!audio) {
    console.log('Audio not found:', audioId);
    return res.status(404).json({ success: false, message: 'Audio not found' });
  }

  if (!user.savedAudios) {
    user.savedAudios = [];
  }

  const isSaved = user.savedAudios.some(id => id && id.toString() === audioId);
  console.log('Current isSaved state:', isSaved);

  if (isSaved) {
    user.savedAudios = user.savedAudios.filter(id => id && id.toString() !== audioId);
    console.log('Removed from savedAudios');
  } else {
    user.savedAudios.push(audioId);
    console.log('Added to savedAudios');
  }

  await user.save();
  console.log('User saved. New savedAudios:', user.savedAudios);

  res.status(200).json({
    success: true,
    message: isSaved ? 'Audio removed from library' : 'Audio saved to library',
    isSaved: !isSaved
  });
});

/**
 * @desc    Get current user's saved audios
 * @route   GET /api/audios/saved
 * @access  Private
 */
export const getSavedAudios = asyncHandler(async (req, res) => {
  console.log('--- getSavedAudios ---');
  console.log('User ID:', req.user?._id);

  const user = await User.findById(req.user._id).populate('savedAudios');
  console.log('Raw savedAudios from DB:', user.savedAudios);
  
  const activeSavedAudios = (user.savedAudios || []).filter(audio => audio !== null && audio !== undefined);
  console.log('Active savedAudios count:', activeSavedAudios.length);

  res.status(200).json({
    success: true,
    count: activeSavedAudios.length,
    audios: activeSavedAudios.map(audio => ({
      ...audio.toObject(),
      isSaved: true
    }))
  });
});
