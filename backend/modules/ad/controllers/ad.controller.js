import Ad from '../../../models/Ad.model.js';
import User from '../../../models/User.model.js';
import Admin from '../../../models/Admin.model.js';
import Like from '../../../models/Like.model.js';
import Comment from '../../../models/Comment.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { uploadToS3, getFileUrl, deleteFromS3 } from '../../../utils/s3.js';
import fs from 'fs';


/**
 * @desc    Create a new advertisement
 * @route   POST /api/ads
 * @access  Private
 */
export const createAd = asyncHandler(async (req, res) => {
  const mediaFile = req.files?.['media']?.[0];
  const musicFile = req.files?.['musicFile']?.[0];

  if (!mediaFile) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a video or photo for the advertisement'
    });
  }

  const { caption, link, targetCountry, targetState, targetDistricts, adType, whatsappNumber, welcomeMessage, musicName, isPlatformAd } = req.body;
  const parsedDistricts = targetDistricts ? (typeof targetDistricts === 'string' ? JSON.parse(targetDistricts) : targetDistricts) : [];
  const parsedStates = targetState ? (typeof targetState === 'string' ? (targetState.startsWith('[') ? JSON.parse(targetState) : [targetState].filter(Boolean)) : targetState) : [];

  // Upload Media to S3
  const s3Result = await uploadToS3(mediaFile.path, 'ads', mediaFile.mimetype);
  fs.unlinkSync(mediaFile.path);

  const mediaType = mediaFile.mimetype.startsWith('video') ? 'video' : 'image';

  // Optional Music Upload
  let musicData = { name: musicName || '', url: '' };
  let musicResult = null;
  if (musicFile) {
    musicResult = await uploadToS3(musicFile.path, 'ads/music', musicFile.mimetype);
    fs.unlinkSync(musicFile.path);
    musicData.url = await getFileUrl(musicResult.key);
    if (!musicData.name) musicData.name = musicFile.originalname;
  }

  let onModel = 'User';
  let adUserId = req.user ? req.user._id : null;

  // Only assign Admin model if the requester is actually authenticated as an admin
  if (req.admin) {
    onModel = 'Admin';
    adUserId = req.admin._id;
  }

  const ad = await Ad.create({
    user: adUserId,
    onModel,
    media: {
      url: await getFileUrl(s3Result.key),
      publicId: s3Result.key,
      type: mediaType
    },
    caption: caption || '',
    link: link || '',
    adType: adType || 'shop',
    whatsappNumber: whatsappNumber || '',
    welcomeMessage: welcomeMessage || '',
    targetCountry: targetCountry || 'India',
    targetState: parsedStates,
    targetDistricts: parsedDistricts,
    music: musicResult ? {
      name: musicData.name,
      url: musicData.url,
      publicId: musicResult.key
    } : undefined,
    isActive: true,
    status: req.admin ? 'approved' : 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Advertisement created successfully',
    ad
  });
});

/**
 * @desc    Get current user's advertisements
 * @route   GET /api/ads/me
 * @access  Private
 */
export const getMyAds = asyncHandler(async (req, res) => {
  const ads = await Ad.find({ user: req.user._id, onModel: 'User' })
    .sort({ createdAt: -1 });

  // Self-healing: sync actual like/comment counts from sub-collections
  const Like = (await import('../../../models/Like.model.js')).default;
  const Comment = (await import('../../../models/Comment.model.js')).default;

  const syncedAds = await Promise.all(ads.map(async (ad) => {
    const [actualLikes, actualComments] = await Promise.all([
      Like.countDocuments({ ad: ad._id }),
      Comment.countDocuments({ ad: ad._id, isDeleted: false, parentComment: null })
    ]);
    const adObj = ad.toObject();
    adObj.stats = { ...adObj.stats, likesCount: actualLikes, commentsCount: actualComments };
    const likesCount = ad.stats?.likesCount ?? 0;
    const commentsCount = ad.stats?.commentsCount ?? 0;
    if (likesCount !== actualLikes || commentsCount !== actualComments) {
      Ad.findByIdAndUpdate(ad._id, {
        $set: { 'stats.likesCount': actualLikes, 'stats.commentsCount': actualComments }
      }).catch(() => {});
    }
    return adObj;
  }));

  res.status(200).json({
    success: true,
    ads: syncedAds
  });
});

/**
 * @desc    Toggle ad status (active/inactive)
 * @route   PATCH /api/ads/:id/toggle
 * @access  Private
 */
export const toggleAdStatus = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  if (!req.admin && ad.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });
  }

  ad.isActive = !ad.isActive;
  await ad.save();

  res.status(200).json({
    success: true,
    message: `Ad is now ${ad.isActive ? 'active' : 'inactive'}`,
    ad
  });
});

/**
 * @desc    Delete an advertisement
 * @route   DELETE /api/ads/:id
 * @access  Private
 */
export const getAdAnalytics = asyncHandler(async (req, res) => {
  let ad;
  if (req.admin) {
    ad = await Ad.findById(req.params.id).populate('user', 'username fullName profilePicture');
  } else {
    ad = await Ad.findOne({ _id: req.params.id, user: req.user._id });
  }

  if (!ad || (req.admin && !ad.user)) {
    return res.status(404).json({ success: false, message: 'Ad not found' });
  }

  // Self-healing: sync actual counts from Like and Comment collections
  const Like = (await import('../../../models/Like.model.js')).default;
  const Comment = (await import('../../../models/Comment.model.js')).default;

  const [actualLikes, actualComments] = await Promise.all([
    Like.countDocuments({ ad: ad._id }),
    Comment.countDocuments({ ad: ad._id, isDeleted: false, parentComment: null })
  ]);

  const likesCount = ad.stats?.likesCount ?? 0;
  const commentsCount = ad.stats?.commentsCount ?? 0;

  // Update if out of sync
  if (likesCount !== actualLikes || commentsCount !== actualComments) {
    await Ad.findByIdAndUpdate(ad._id, {
      $set: {
        'stats.likesCount': actualLikes,
        'stats.commentsCount': actualComments
      }
    });
    if (!ad.stats) ad.stats = {};
    ad.stats.likesCount = actualLikes;
    ad.stats.commentsCount = actualComments;
  }

  res.json({ success: true, ad });
});

export const deleteAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  if (!req.admin && ad.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });
  }

  await ad.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Advertisement deleted successfully'
  });
});

/**
 * @desc    Get all advertisements (Admin)
 * @route   GET /api/ads/admin/all
 * @access  Private/Admin
 */
export const getAllAds = asyncHandler(async (req, res) => {

  const ads = await Ad.find({ onModel: 'Admin' })

    .populate('user', 'username profilePicture fullName email')
    .sort({ createdAt: -1 });

  const activeAdminAds = ads.filter(ad => ad.user);

  res.status(200).json({
    success: true,
    ads: activeAdminAds
  });
});

/**
 * @desc    Get all user advertisements (Admin)
 * @route   GET /api/ads/admin/user-ads
 * @access  Private/Admin
 */
export const getUserAds = asyncHandler(async (req, res) => {

  const ads = await Ad.find({ onModel: 'User' })
    .populate('user', 'username profilePicture fullName email')
    .sort({ createdAt: -1 });

  const activeUserAds = ads.filter(ad => ad.user);

  // Self-healing: sync actual like/comment counts from sub-collections
  const Like = (await import('../../../models/Like.model.js')).default;
  const Comment = (await import('../../../models/Comment.model.js')).default;

  const syncedAds = await Promise.all(activeUserAds.map(async (ad) => {
    const [actualLikes, actualComments] = await Promise.all([
      Like.countDocuments({ ad: ad._id }),
      Comment.countDocuments({ ad: ad._id, isDeleted: false, parentComment: null })
    ]);
    const adObj = ad.toObject();
    adObj.stats = {
      ...adObj.stats,
      likesCount: actualLikes,
      commentsCount: actualComments
    };
    const likesCount = ad.stats?.likesCount ?? 0;
    const commentsCount = ad.stats?.commentsCount ?? 0;
    // Update DB if stale
    if (likesCount !== actualLikes || commentsCount !== actualComments) {
      Ad.findByIdAndUpdate(ad._id, {
        $set: { 'stats.likesCount': actualLikes, 'stats.commentsCount': actualComments }
      }).catch(() => {});
    }
    return adObj;
  }));

  res.status(200).json({
    success: true,
    ads: syncedAds
  });
});


/**
 * @desc    Get ads for feed based on user state
 * @route   GET /api/ads/feed
 * @access  Private
 */
export const getAdsForFeed = asyncHandler(async (req, res) => {
  const userCountry = req.user.country || 'India';
  const userState = req.user.state || '';
  
  const query = { isActive: true, status: 'approved' };
  
  // Ad target matching logic:
  // - Ad must not restrict country, OR restrict to user's country
  // - Ad must not restrict state, OR restrict to user's state
  // - Ad must not restrict district, OR restrict to user's district
  query.$and = [
    { $or: [{ targetCountry: { $exists: false } }, { targetCountry: '' }, { targetCountry: userCountry }] },
    { $or: [{ targetState: { $exists: false } }, { targetState: '' }, { targetState: { $size: 0 } }, { targetState: userState }] },
    { $or: [{ targetDistricts: { $size: 0 } }, { targetDistricts: { $exists: false } }, { targetDistricts: req.user.district }] }
  ];

  const ads = await Ad.find(query).populate('user', 'username profilePicture').limit(5);

  const activeAds = ads.filter(ad => ad.user);

  res.status(200).json({
    success: true,
    ads: activeAds
  });
});

/**
 * @desc    Track ad view
 * @route   POST /api/ads/:id/view
 * @access  Public
 */
export const trackView = asyncHandler(async (req, res) => {
  await Ad.findByIdAndUpdate(req.params.id, { $inc: { 'stats.viewsCount': 1 } });
  res.status(200).json({ success: true });
});

/**
 * @desc    Track ad click
 * @route   POST /api/ads/:id/click
 * @access  Public
 */
export const trackClick = asyncHandler(async (req, res) => {
  await Ad.findByIdAndUpdate(req.params.id, { $inc: { 'stats.clicksCount': 1 } });
  res.status(200).json({ success: true });
});
/**
 * @desc    Update an advertisement
 * @route   PUT /api/ads/:id
 * @access  Private/Admin
 */
export const updateAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  if (!req.admin && ad.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to edit this advertisement'
    });
  }

  const { caption, link, targetCountry, targetState, targetDistricts, adType, whatsappNumber, welcomeMessage, musicName, isActive } = req.body;
  const mediaFile = req.files?.['media']?.[0];
  const musicFile = req.files?.['musicFile']?.[0];

  // Update basic fields
  if (caption !== undefined) ad.caption = caption;
  if (link !== undefined) ad.link = link;
  if (adType !== undefined) ad.adType = adType;
  if (whatsappNumber !== undefined) ad.whatsappNumber = whatsappNumber;
  if (welcomeMessage !== undefined) ad.welcomeMessage = welcomeMessage;
  if (isActive !== undefined) ad.isActive = isActive === 'true' || isActive === true;

  if (targetCountry !== undefined) ad.targetCountry = targetCountry;
  if (targetState !== undefined) {
    ad.targetState = typeof targetState === 'string'
      ? (targetState.startsWith('[') ? JSON.parse(targetState) : [targetState].filter(Boolean))
      : targetState;
  }
  if (targetDistricts !== undefined) {
    ad.targetDistricts = typeof targetDistricts === 'string' ? JSON.parse(targetDistricts) : targetDistricts;
  }

  // Optional Media Replacement
  if (mediaFile) {
    // Delete old media from S3
    if (ad.media?.publicId) {
      await deleteFromS3(ad.media.publicId);
    }

    const s3Result = await uploadToS3(mediaFile.path, 'ads', mediaFile.mimetype);
    fs.unlinkSync(mediaFile.path);
    ad.media = {
      url: await getFileUrl(s3Result.key),
      publicId: s3Result.key,
      type: mediaFile.mimetype.startsWith('video') ? 'video' : 'image'
    };
  }

  // Optional Music Replacement
  if (musicFile) {
    // Delete old music from S3
    if (ad.music?.publicId) {
      await deleteFromS3(ad.music.publicId);
    }

    const musicResult = await uploadToS3(musicFile.path, 'ads/music', musicFile.mimetype);
    fs.unlinkSync(musicFile.path);
    ad.music = {
      name: musicName || musicFile.originalname,
      url: await getFileUrl(musicResult.key),
      publicId: musicResult.key
    };
  } else if (musicName && ad.music) {
    ad.music.name = musicName;
  }

  await ad.save();

  res.status(200).json({
    success: true,
    message: 'Advertisement updated successfully',
    ad
  });
});

/**
 * @desc    Review advertisement (Approve/Reject) (Admin)
 * @route   PATCH /api/ads/:id/review
 * @access  Private/Admin
 */
export const reviewAd = asyncHandler(async (req, res) => {
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized as admin'
    });
  }

  const { status } = req.body;
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid status: approved, rejected, or pending'
    });
  }

  const ad = await Ad.findById(req.params.id);
  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  ad.status = status;
  await ad.save();

  res.status(200).json({
    success: true,
    message: `Advertisement status updated to ${status}`,
    ad
  });
});
