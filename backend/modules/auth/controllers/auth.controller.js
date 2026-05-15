import User from '../../../models/User.model.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { sendTokenResponse } from '../../../middleware/auth.js';
import { sendOTPSMS } from '../../../utils/smsService.js';

/**
 * @desc    Send OTP to phone number
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOTP = asyncHandler(async (req, res) => {
  const { phoneNumber, countryCode = '+91', mode = 'signup' } = req.body; // Default to India +91

  // Validate phone number
  if (!phoneNumber || phoneNumber.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number'
    });
  }

  // Check if user exists
  let user = await User.findOne({ phoneNumber });

  if (mode === 'login' && !user) {
    return res.status(404).json({
      success: false,
      message: 'User not found. Please sign up first.',
      requireSignup: true
    });
  }

  if (!user) {
    // Create new user if doesn't exist
    const tempUsername = `user_${Math.floor(100000 + Math.random() * 900000)}`;
    user = new User({ 
      phoneNumber, 
      countryCode,
      username: tempUsername,
      fullName: `User ${tempUsername.split('_')[1]}`
    });
  }

  // Generate OTP
  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Send OTP via SMS service
  try {
    const smsResult = await sendOTPSMS(phoneNumber, otp, countryCode);

    res.status(200).json({
      success: true,
      message: smsResult.message || 'OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { 
        otp,
        expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 10} minutes`
      }) // Send OTP in response for development/testing
    });
  } catch (error) {
    // Clear OTP if SMS sending fails
    user.clearOTP();
    await user.save({ validateBeforeSave: false });
    
    console.error('Failed to send OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

/**
 * @desc    Verify OTP and login/register
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOTP = asyncHandler(async (req, res) => {
  const { phoneNumber, otp, fcmTokenMobile, fcmToken } = req.body;

  // Find user
  const user = await User.findOne({ phoneNumber });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify OTP
  if (!user.verifyOTP(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }

  // Store FCM tokens if provided
  if (fcmTokenMobile) user.fcmTokenMobile = fcmTokenMobile;
  if (fcmToken) user.fcmToken = fcmToken;

  // Clear OTP and update last login
  user.clearOTP();
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Send token response
  await sendTokenResponse(user, 200, res, 'Login successful');
});

/**
 * @desc    Refresh Token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token not found'
    });
  }

  // Find user with this refresh token
  const user = await User.findOne({ refreshToken: token });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }

  // Verify token
  try {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Issue new tokens
    await sendTokenResponse(user, 200, res, 'Token refreshed');
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token expired or invalid'
    });
  }
});

/**
 * @desc    Complete user profile after OTP verification
 * @route   POST /api/auth/complete-profile
 * @access  Private
 */
export const completeProfile = asyncHandler(async (req, res) => {
  const { username, fullName, email, country, state, dateOfBirth } = req.body;

  // Check if username is already taken
  if (username) {
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }
    req.user.username = username.toLowerCase();
  }

  // Update user profile fields
  if (fullName) req.user.fullName = fullName;
  if (email) req.user.email = email;
  if (country) req.user.country = country;
  if (state) req.user.state = state;
  if (dateOfBirth) req.user.dateOfBirth = dateOfBirth;
  
  // Set isVerified if profile completed
  req.user.isVerified = true;

  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Profile completed successfully',
    user: req.user
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token in database
  req.user.refreshToken = undefined;
  await req.user.save({ validateBeforeSave: false });

  // Clear refresh token cookie
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Check username availability
 * @route   GET /api/auth/check-username/:username
 * @access  Public
 */
export const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username: username.toLowerCase() });

  res.status(200).json({
    success: true,
    available: !user
  });
});
/**
 * @desc    Update user interests
 * @route   POST /api/auth/interests
 * @access  Private
 */
export const updateInterests = asyncHandler(async (req, res) => {
  const { interests } = req.body;

  if (!interests || !Array.isArray(interests)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of interests'
    });
  }

  req.user.interests = interests;
  req.user.isOnboarded = true;
  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Interests updated successfully',
    user: req.user
  });
});
