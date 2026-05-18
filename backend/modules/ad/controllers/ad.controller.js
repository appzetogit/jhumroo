import Ad from '../../../models/Ad.model.js';
import User from '../../../models/User.model.js';
import Admin from '../../../models/Admin.model.js';
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

  const { caption, link, targetStates, adType, whatsappNumber, welcomeMessage, musicName, isPlatformAd } = req.body;
  const statesArray = targetStates ? (typeof targetStates === 'string' ? JSON.parse(targetStates) : targetStates) : [];

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
  if (req.admin || isPlatformAd === 'true') {
    onModel = 'Admin';
  } else if (req.user) {
    // Check if this user is actually an admin by email
    const adminAccount = await Admin.findOne({ email: req.user.email });
    if (adminAccount) {
      onModel = 'Admin';
    }
  }

  const ad = await Ad.create({
    user: req.admin ? req.admin._id : req.user._id,
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
    targetStates: statesArray,
    music: musicResult ? {
      name: musicData.name,
      url: musicData.url,
      publicId: musicResult.key
    } : undefined,
    isActive: true
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

  res.status(200).json({
    success: true,
    ads
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

  if (ad.user.toString() !== req.user._id.toString()) {
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

  if (ad.user.toString() !== req.user._id.toString()) {
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
  // Fix attribution for existing ads created by admins
  // 1. Check by Admin IDs
  const admins = await Admin.find().select('_id email');
  const adminIds = admins.map(a => a._id);
  const adminEmails = admins.map(a => a.email);

  // 2. Check for Users who are actually Admins (by email)
  const adminUsers = await User.find({ email: { $in: adminEmails } }).select('_id');
  const adminUserIds = adminUsers.map(u => u._id);

  // 3. Migrate all such ads to 'Admin' model
  await Ad.updateMany({ 
    user: { $in: [...adminIds, ...adminUserIds] }, 
    onModel: 'User' 
  }, { onModel: 'Admin' });

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
  // Fix attribution for existing ads created by admins (Ensure they don't show up in User Ads)
  const admins = await Admin.find().select('_id email');
  const adminIds = admins.map(a => a._id);
  const adminEmails = admins.map(a => a.email);
  const adminUsers = await User.find({ email: { $in: adminEmails } }).select('_id');
  const adminUserIds = adminUsers.map(u => u._id);

  await Ad.updateMany({ 
    user: { $in: [...adminIds, ...adminUserIds] }, 
    onModel: 'User' 
  }, { onModel: 'Admin' });

  console.log('Migration IDs:', [...adminIds, ...adminUserIds]);

  const ads = await Ad.find({ onModel: 'User' })

    .populate('user', 'username profilePicture fullName email')
    .sort({ createdAt: -1 });

  const activeUserAds = ads.filter(ad => ad.user);

  res.status(200).json({
    success: true,
    ads: activeUserAds
  });
});


/**
 * @desc    Get ads for feed based on user state
 * @route   GET /api/ads/feed
 * @access  Private
 */
export const getAdsForFeed = asyncHandler(async (req, res) => {
  const userState = req.user.state;
  
  const query = { isActive: true };
  if (userState) {
    query.$or = [
      { targetStates: { $size: 0 } }, // All states
      { targetStates: userState }     // Specifically targeted to user's state
    ];
  }

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

  const { caption, link, targetStates, adType, whatsappNumber, welcomeMessage, musicName, isActive } = req.body;
  const mediaFile = req.files?.['media']?.[0];
  const musicFile = req.files?.['musicFile']?.[0];

  // Update basic fields
  if (caption !== undefined) ad.caption = caption;
  if (link !== undefined) ad.link = link;
  if (adType !== undefined) ad.adType = adType;
  if (whatsappNumber !== undefined) ad.whatsappNumber = whatsappNumber;
  if (welcomeMessage !== undefined) ad.welcomeMessage = welcomeMessage;
  if (isActive !== undefined) ad.isActive = isActive === 'true' || isActive === true;

  if (targetStates) {
    ad.targetStates = typeof targetStates === 'string' ? JSON.parse(targetStates) : targetStates;
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
