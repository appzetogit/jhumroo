import User from '../../../models/User.model.js';
import SystemSetting from '../../../models/SystemSetting.model.js';
import PremiumSubscription from '../../../models/PremiumSubscription.model.js';
import razorpayService from '../../../services/razorpay.service.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';

const DEFAULT_PREMIUM_PRICE = 199; // Default ₹199 per month

/**
 * Helper to fetch premium pricing from SystemSetting
 */
export const getPremiumPricing = async () => {
  const setting = await SystemSetting.findOne({ key: 'premium_pricing' });
  if (setting && setting.value && typeof setting.value.monthlyPrice === 'number') {
    return {
      monthlyPrice: setting.value.monthlyPrice,
      currency: setting.value.currency || 'INR'
    };
  }
  return {
    monthlyPrice: DEFAULT_PREMIUM_PRICE,
    currency: 'INR'
  };
};

/**
 * @desc    Get current premium plan details & user status
 * @route   GET /api/premium/plan
 * @access  Public / Optional Auth
 */
export const getPlanDetails = asyncHandler(async (req, res) => {
  const pricing = await getPremiumPricing();
  
  let userStatus = {
    isPremium: false,
    premiumExpiresAt: null,
    daysLeft: 0
  };

  if (req.user) {
    const isStillActive = Boolean(
      req.user.isPremium && 
      req.user.premiumExpiresAt && 
      new Date(req.user.premiumExpiresAt) > new Date()
    );

    let daysLeft = 0;
    if (isStillActive) {
      const diffMs = new Date(req.user.premiumExpiresAt) - new Date();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    userStatus = {
      isPremium: isStillActive,
      premiumExpiresAt: req.user.premiumExpiresAt,
      daysLeft
    };
  }

  res.status(200).json({
    success: true,
    plan: {
      name: 'Jhumroo Elite Premium',
      durationDays: 30,
      monthlyPrice: pricing.monthlyPrice,
      currency: pricing.currency,
      features: [
        'Go Live with followers and meetups online',
        'Ultra HD 4K high-bitrate video uploads',
        'Ad-Free Browsing experience throughout the app'
      ]
    },
    userStatus
  });
});

/**
 * @desc    Create Razorpay order for purchasing Premium
 * @route   POST /api/premium/create-order
 * @access  Private
 */
export const createPremiumOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const pricing = await getPremiumPricing();
  const amount = pricing.monthlyPrice;

  // Create order via Razorpay service
  const receipt = `prem_${userId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;
  const order = await razorpayService.createOrder({
    amount,
    currency: pricing.currency,
    receipt,
    notes: {
      userId: userId.toString(),
      type: 'premium_subscription',
      durationDays: 30
    }
  });

  // Calculate prospective start & end date
  const now = new Date();
  const baseDate = (req.user.isPremium && req.user.premiumExpiresAt && new Date(req.user.premiumExpiresAt) > now)
    ? new Date(req.user.premiumExpiresAt)
    : now;
  const prospectiveEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create pending subscription record
  const subscription = await PremiumSubscription.create({
    user: userId,
    amount,
    currency: pricing.currency,
    planDurationDays: 30,
    startDate: now,
    endDate: prospectiveEndDate,
    status: 'pending',
    razorpayOrderId: order.id
  });

  res.status(200).json({
    success: true,
    order,
    subscriptionId: subscription._id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    amount,
    currency: pricing.currency
  });
});

/**
 * @desc    Verify Razorpay payment signature & activate Premium
 * @route   POST /api/premium/verify-payment
 * @access  Private
 */
export const verifyPremiumPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { subscriptionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing required Razorpay payment credentials.'
    });
  }

  // Verify signature
  const isSignatureValid = razorpayService.verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isSignatureValid) {
    if (subscriptionId) {
      await PremiumSubscription.findByIdAndUpdate(subscriptionId, { status: 'failed' });
    }
    return res.status(400).json({
      success: false,
      message: 'Invalid Razorpay payment signature verification.'
    });
  }

  // Find or link subscription
  let subscription = null;
  if (subscriptionId) {
    subscription = await PremiumSubscription.findById(subscriptionId);
  }
  if (!subscription) {
    subscription = await PremiumSubscription.findOne({ razorpayOrderId: razorpay_order_id });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Calculate new end date (extend if already active, or start 30 days from now)
  const now = new Date();
  const currentExpiry = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
  const baseDate = (user.isPremium && currentExpiry && currentExpiry > now)
    ? currentExpiry
    : now;
  const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update User
  user.isPremium = true;
  user.premiumExpiresAt = newEndDate;
  user.premiumPlan = 'monthly';
  if (!user.isOnboarded) {
    user.isOnboarded = true;
  }
  if (!user.isProfileCompleted && user.fullName) {
    user.isProfileCompleted = true;
  }
  await user.save();

  // Update Subscription record
  if (subscription) {
    subscription.status = 'active';
    subscription.endDate = newEndDate;
    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    await subscription.save();
  } else {
    subscription = await PremiumSubscription.create({
      user: userId,
      amount: DEFAULT_PREMIUM_PRICE,
      currency: 'INR',
      planDurationDays: 30,
      startDate: now,
      endDate: newEndDate,
      status: 'active',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });
  }

  res.status(200).json({
    success: true,
    message: 'Congratulations! Jhumroo Premium has been activated.',
    user: {
      _id: user._id,
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      isProfileCompleted: user.isProfileCompleted,
      isOnboarded: user.isOnboarded,
      interests: user.interests || [],
      isPremium: true,
      premiumExpiresAt: user.premiumExpiresAt,
      premiumPlan: user.premiumPlan
    },
    subscription
  });
});

/**
 * @desc    Get pricing configuration for Admin
 * @route   GET /api/premium/admin/pricing
 * @access  Private/Admin
 */
export const getPricingAdmin = asyncHandler(async (req, res) => {
  const pricing = await getPremiumPricing();
  res.status(200).json({
    success: true,
    pricing
  });
});

/**
 * @desc    Update premium monthly price (Admin)
 * @route   PUT /api/premium/admin/pricing
 * @access  Private/Admin
 */
export const updatePricingAdmin = asyncHandler(async (req, res) => {
  const { monthlyPrice } = req.body;

  if (monthlyPrice === undefined || monthlyPrice === null) {
    return res.status(400).json({
      success: false,
      message: 'Please provide monthlyPrice.'
    });
  }

  const priceNum = parseFloat(monthlyPrice);
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({
      success: false,
      message: 'Monthly price must be a valid positive number.'
    });
  }

  const updatedSetting = await SystemSetting.findOneAndUpdate(
    { key: 'premium_pricing' },
    {
      key: 'premium_pricing',
      value: {
        monthlyPrice: Math.round(priceNum),
        currency: 'INR',
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Premium monthly price updated successfully.',
    pricing: updatedSetting.value
  });
});

/**
 * @desc    Get list of all Premium Users for Admin
 * @route   GET /api/premium/admin/users
 * @access  Private/Admin
 */
export const getPremiumUsersAdmin = asyncHandler(async (req, res) => {
  const { search = '', status = 'all', page = 1, limit = 50 } = req.query;

  // Find all active subscriptions or find users with isPremium true
  // Let's get distinct subscriptions, newest first
  let query = {};
  if (status === 'active') {
    query.status = 'active';
    query.endDate = { $gt: new Date() };
  } else if (status === 'expired') {
    query.$or = [
      { status: 'expired' },
      { status: 'active', endDate: { $lte: new Date() } }
    ];
  }

  const totalSubscriptions = await PremiumSubscription.countDocuments(query);
  const subscriptions = await PremiumSubscription.find(query)
    .populate('user', 'username fullName profilePicture phoneNumber email isPremium premiumExpiresAt isVerified')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  // Compute aggregate stats
  const activeSubsCount = await PremiumSubscription.countDocuments({
    status: 'active',
    endDate: { $gt: new Date() }
  });

  const totalUsersWithPremium = await User.countDocuments({
    isPremium: true,
    premiumExpiresAt: { $gt: new Date() }
  });

  const revenueAggregate = await PremiumSubscription.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
  ]);
  const totalRevenue = revenueAggregate[0]?.totalRevenue || 0;

  // Filter search on populated user if provided
  let filtered = subscriptions;
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = subscriptions.filter(sub => {
      const u = sub.user;
      if (!u) return false;
      return (
        (u.username && u.username.toLowerCase().includes(s)) ||
        (u.fullName && u.fullName.toLowerCase().includes(s)) ||
        (u.phoneNumber && u.phoneNumber.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (sub.razorpayPaymentId && sub.razorpayPaymentId.toLowerCase().includes(s))
      );
    });
  }

  res.status(200).json({
    success: true,
    stats: {
      activeSubscribers: activeSubsCount,
      totalActiveUsers: totalUsersWithPremium,
      totalRevenue,
      totalRecords: totalSubscriptions
    },
    users: filtered
  });
});

/**
 * @desc    Delete a subscription record (Admin)
 * @route   DELETE /api/premium/admin/subscriptions/:id
 * @access  Private/Admin
 */
export const deleteSubscriptionAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subscription = await PremiumSubscription.findById(id);
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription record not found.'
    });
  }

  const userId = subscription.user;

  // Delete the subscription record
  await PremiumSubscription.findByIdAndDelete(id);

  // If subscription was associated with a user, recalculate user's premium status
  if (userId) {
    // Find if the user has any remaining active subscription with future endDate
    const remainingActiveSub = await PremiumSubscription.findOne({
      user: userId,
      status: 'active',
      endDate: { $gt: new Date() }
    }).sort({ endDate: -1 });

    if (remainingActiveSub) {
      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        premiumExpiresAt: remainingActiveSub.endDate,
        premiumPlan: 'monthly'
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        isPremium: false,
        premiumExpiresAt: null,
        premiumPlan: null
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Subscription deleted successfully.'
  });
});
