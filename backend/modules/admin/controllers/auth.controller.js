import Admin from '../../../models/Admin.model.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';

/**
 * Generate JWT tokens for admin
 */
const generateAdminToken = (id, isRefresh = false) => {
  const expiresIn = isRefresh ? '30d' : '24h';
  return jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn });
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Find admin with password field
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if admin is active
  if (!admin.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is disabled. Please contact super admin.'
    });
  }

  // Verify password
  const isPasswordValid = await admin.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate tokens
  const accessToken = generateAdminToken(admin._id);
  const refreshToken = generateAdminToken(admin._id, true);

  // Save refresh token
  admin.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });

  // Update last login
  admin.lastLogin = new Date();

  // Log activity
  admin.addActivity('login', 'Admin logged in', req.ip);

  await admin.save();

  // Remove password from response
  admin.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    admin,
    accessToken,
    refreshToken
  });
});

/**
 * @desc    Refresh admin access token
 * @route   POST /api/admin/auth/refresh
 * @access  Public
 */
export const refreshAdminToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Find admin and check if refresh token exists
    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in database
    const tokenExists = admin.refreshTokens.some(
      (t) => t.token === refreshToken && t.expiresAt > new Date()
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateAdminToken(admin._id);

    res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @desc    Admin logout
 * @route   POST /api/admin/auth/logout
 * @access  Private/Admin
 */
export const adminLogout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const admin = req.admin;

  // Remove specific refresh token or all tokens
  if (refreshToken) {
    admin.refreshTokens = admin.refreshTokens.filter(
      (t) => t.token !== refreshToken
    );
  } else {
    admin.refreshTokens = [];
  }

  admin.addActivity('logout', 'Admin logged out', req.ip);
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Get current admin profile
 * @route   GET /api/admin/auth/me
 * @access  Private/Admin
 */
export const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = req.admin;

  res.status(200).json({
    success: true,
    admin
  });
});

/**
 * @desc    Update admin profile
 * @route   PUT /api/admin/auth/profile
 * @access  Private/Admin
 */
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, profilePicture } = req.body;
  const admin = req.admin;

  if (fullName) admin.fullName = fullName;
  if (phoneNumber) admin.phoneNumber = phoneNumber;
  if (profilePicture) admin.profilePicture = profilePicture;

  admin.addActivity('profile_update', 'Admin updated profile', req.ip);
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    admin
  });
});

/**
 * @desc    Change admin password
 * @route   PUT /api/admin/auth/change-password
 * @access  Private/Admin
 */
export const changeAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin._id).select('+password');

  // Validate inputs
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current and new password'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }

  // Verify current password
  const isPasswordValid = await admin.comparePassword(currentPassword);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  admin.password = newPassword;
  admin.refreshTokens = []; // Clear all refresh tokens
  admin.addActivity('password_change', 'Admin changed password', req.ip);
  
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please login again.'
  });
});

/**
 * @desc    Get admin activity log
 * @route   GET /api/admin/auth/activity-log
 * @access  Private/Admin
 */
export const getActivityLog = asyncHandler(async (req, res) => {
  const admin = req.admin;
  const { limit = 50 } = req.query;

  const activities = admin.activityLog
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    count: activities.length,
    activities
  });
});
