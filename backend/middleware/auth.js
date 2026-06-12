import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import Admin from '../models/Admin.model.js';

/**
 * Protect routes - verify JWT token
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Prioritize Admin check if token claims admin status
      if (decoded.isAdmin) {
        const admin = await Admin.findById(decoded.id).select('-refreshTokens');
        if (admin) {
          req.admin = admin;
          req.user = admin; // For compatibility with generic controllers
          
          if (!admin.isActive) {
            return res.status(403).json({
              success: false,
              message: 'Admin account is disabled'
            });
          }
          return next();
        }
      }

      // Get user from token if not an admin or admin check failed
      req.user = await User.findById(decoded.id).select('-otp -deviceTokens');


      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!req.user.isActive || req.user.isBanned) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive or banned'
        });
      }

      next();
    } catch (error) {
      console.error('JWT Verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - no error if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-otp -deviceTokens');
      } catch (error) {
        // Token invalid, but continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Access JWT token
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h'
  });
};

/**
 * Generate Refresh JWT token
 */
export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
  });
};

/**
 * Send token response
 */
export const sendTokenResponse = async (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_REFRESH_EXPIRY) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json({
      success: true,
      message,
      token,
      refreshToken,
      user
    });
};

/**
 * Authorize roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user ? req.user.role : 'none'} is not authorized to access this route`
      });
    }
    next();
  };
};
