import jwt from 'jsonwebtoken';
import { query } from '../../../config/postgres.js';

/**
 * Protect routes - strict JWT authentication.
 * Resolves user from the PostgreSQL database using ID encoded in token claims.
 */
export const protectPostgres = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authorization token is missing.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const userRes = await query(
        'SELECT id, username, email, interests FROM users WHERE id = $1 LIMIT 1',
        [decoded.id]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Authorization failed. User no longer exists.'
        });
      }

      req.user = userRes.rows[0];
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or token is invalid.',
        error: err.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - allows guest views, but captures user context if token exists.
 */
export const optionalAuthPostgres = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userRes = await query(
          'SELECT id, username, email, interests FROM users WHERE id = $1 LIMIT 1',
          [decoded.id]
        );

        if (userRes.rows.length > 0) {
          req.user = userRes.rows[0];
        }
      } catch (err) {
        // Continue silently as guest if token is invalid or expired
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
