import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.model.js';

/**
 * Protect admin routes - verify JWT token and check if user is admin
 */
export const protectAdmin = async (req, res, next) => {
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

      // Check if token is for admin
      if (!decoded.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      // Get admin from token
      req.admin = await Admin.findById(decoded.id).select('-refreshTokens');

      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }

      if (!req.admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Admin account is disabled'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Check if admin has specific permission
 * @param {string} permission - Required permission
 */
export const checkPermission = (permission) => {
  return (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Super admins have all permissions
    if (admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has the required permission
    if (!admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${permission}`
      });
    }

    next();
  };
};

/**
 * Check if admin has specific role(s)
 * @param {...string} roles - Required role(s)
 */
export const checkRole = (...roles) => {
  return (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Super admin only middleware
 */
export const superAdminOnly = (req, res, next) => {
  const admin = req.admin;

  if (!admin || admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.'
    });
  }

  next();
};

/**
 * Log admin activity middleware
 */
export const logActivity = (action) => {
  return async (req, res, next) => {
    try {
      const admin = req.admin;
      
      if (admin) {
        admin.addActivity(
          action,
          `${req.method} ${req.originalUrl}`,
          req.ip
        );
        // Don't wait for save, do it async
        admin.save().catch(err => console.error('Error logging admin activity:', err));
      }
      
      next();
    } catch (error) {
      // Don't block the request if logging fails
      console.error('Error in logActivity middleware:', error);
      next();
    }
  };
};
