import User from '../../../models/User.model.js';
import SystemSetting from '../../../models/SystemSetting.model.js';
import PremiumSubscription from '../../../models/PremiumSubscription.model.js';
import razorpayService from '../../../services/razorpay.service.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { getIO } from '../../../config/socket.js';

const DEFAULT_PREMIUM_PRICE = 199; // Default ₹199 per month
const DAY_MS = 24 * 60 * 60 * 1000;

// Plan id → duration + the SystemSetting price key (monthlyPrice kept for existing data).
export const PREMIUM_PLANS = {
  weekly: { label: '1 Week', days: 7, priceKey: 'weeklyPrice', defaultPrice: 59 },
  monthly: { label: '1 Month', days: 30, priceKey: 'monthlyPrice', defaultPrice: DEFAULT_PREMIUM_PRICE },
  halfyearly: { label: '6 Months', days: 180, priceKey: 'halfYearlyPrice', defaultPrice: 999 }
};

/** Premium counts only until premiumExpiresAt; isPremium alone is never enough. */
export const isPremiumActive = (u, now = new Date()) =>
  Boolean(u?.isPremium && u?.premiumExpiresAt && new Date(u.premiumExpiresAt) > now);

/** New expiry after buying `days`: stacks on top of a still-running plan, else starts now. */
export const extendPremium = (u, days, now = new Date()) => {
  const base = isPremiumActive(u, now) ? new Date(u.premiumExpiresAt) : now;
  return new Date(base.getTime() + days * DAY_MS);
};

/**
 * Helper to fetch premium pricing from SystemSetting
 */
export const getPremiumPricing = async () => {
  const setting = await SystemSetting.findOne({ key: 'premium_pricing' });
  const v = setting?.value || {};
  const pricing = { currency: v.currency || 'INR' };
  for (const p of Object.values(PREMIUM_PLANS)) {
    pricing[p.priceKey] = typeof v[p.priceKey] === 'number' ? v[p.priceKey] : p.defaultPrice;
  }
  return pricing;
};

const plansList = (pricing) =>
  Object.entries(PREMIUM_PLANS).map(([id, p]) => ({ id, label: p.label, days: p.days, price: pricing[p.priceKey] }));

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
    const isStillActive = isPremiumActive(req.user);

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
      plans: plansList(pricing),
      features: [
        'Go Live with followers and meetups online',
        'Record up to 2-minute long videos',
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
  const planId = req.body?.plan || 'monthly';
  const plan = PREMIUM_PLANS[planId];
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Invalid premium plan.' });
  }
  const pricing = await getPremiumPricing();
  const amount = pricing[plan.priceKey];

  // Create order via Razorpay service
  const receipt = `prem_${userId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;
  const order = await razorpayService.createOrder({
    amount,
    currency: pricing.currency,
    receipt,
    notes: {
      userId: userId.toString(),
      type: 'premium_subscription',
      plan: planId,
      durationDays: plan.days
    }
  });

  // Calculate prospective start & end date
  const now = new Date();
  const prospectiveEndDate = extendPremium(req.user, plan.days, now);

  // Create pending subscription record
  const subscription = await PremiumSubscription.create({
    user: userId,
    amount,
    currency: pricing.currency,
    plan: planId,
    planDurationDays: plan.days,
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
    currency: pricing.currency,
    plan: { id: planId, label: plan.label, days: plan.days }
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
      await PremiumSubscription.findOneAndUpdate({ _id: subscriptionId, user: userId, status: 'pending' }, { status: 'failed' });
    }
    return res.status(400).json({
      success: false,
      message: 'Invalid Razorpay payment signature verification.'
    });
  }

  // Look up by the signed order id (not the client-sent subscriptionId), so a paid 1-week
  // order can't be used to activate a different, pricier pending plan.
  let subscription = await PremiumSubscription.findOne({ razorpayOrderId: razorpay_order_id, user: userId });
  if (subscription?.status === 'active') {
    return res.status(400).json({ success: false, message: 'This payment has already been applied.' });
  }
  // No pending premium order of THIS user behind the signature (e.g. an ad order, or someone
  // else's order) → never grant premium.
  if (!subscription) {
    return res.status(400).json({ success: false, message: 'No matching premium order found for this payment.' });
  }
  const planId = subscription.plan || 'monthly';
  const durationDays = subscription.planDurationDays || 30;

  // Atomically claim the order so two parallel verify calls can't both extend premium.
  const claimed = await PremiumSubscription.findOneAndUpdate(
    { _id: subscription._id, status: { $ne: 'active' } },
    { status: 'active', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
    { new: true }
  );
  if (!claimed) {
    return res.status(400).json({ success: false, message: 'This payment has already been applied.' });
  }
  subscription = claimed;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Calculate new end date (extend if already active, or start 30 days from now)
  const now = new Date();
  const newEndDate = extendPremium(user, durationDays, now);

  // Update User
  user.isPremium = true;
  user.premiumExpiresAt = newEndDate;
  user.premiumPlan = planId;
  if (!user.isOnboarded) {
    user.isOnboarded = true;
  }
  if (!user.isProfileCompleted && user.fullName) {
    user.isProfileCompleted = true;
  }
  await user.save();

  // Update Subscription record
  subscription.endDate = newEndDate;
  await subscription.save();

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
    pricing,
    plans: plansList(pricing)
  });
});

/**
 * @desc    Update premium plan prices (Admin). Body: { weeklyPrice, monthlyPrice, halfYearlyPrice };
 *          any key left out keeps its current value.
 * @route   PUT /api/premium/admin/pricing
 * @access  Private/Admin
 */
export const updatePricingAdmin = asyncHandler(async (req, res) => {
  const current = await getPremiumPricing();
  const next = { ...current };

  for (const p of Object.values(PREMIUM_PLANS)) {
    const raw = req.body?.[p.priceKey];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = parseFloat(raw);
    if (isNaN(num) || num < 1) {
      return res.status(400).json({
        success: false,
        message: `${p.label} price must be a valid positive number.`
      });
    }
    next[p.priceKey] = Math.round(num);
  }

  const updatedSetting = await SystemSetting.findOneAndUpdate(
    { key: 'premium_pricing' },
    {
      key: 'premium_pricing',
      value: { ...next, currency: 'INR', updatedAt: new Date() }
    },
    { upsert: true, new: true }
  );

  // Push new prices to every open Premium screen right away.
  try {
    getIO().emit('premium_pricing_updated', { plans: plansList(next) });
  } catch (err) {
    console.error('[Premium] pricing broadcast failed:', err.message);
  }

  res.status(200).json({
    success: true,
    message: 'Premium plan prices updated successfully.',
    pricing: updatedSetting.value,
    plans: plansList(next)
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
        premiumPlan: remainingActiveSub.plan || 'monthly'
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
