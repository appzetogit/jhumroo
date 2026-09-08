import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';
const isLocal = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return isDev || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost');
};

/**
 * General API rate limiter
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100000 : 2000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocal(req),
});

/**
 * Auth rate limiter (stricter)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 100,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  skipSuccessfulRequests: true,
  skip: (req) => isLocal(req),
});

/**
 * OTP rate limiter
 */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 5000 : 50,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later'
  },
  skipSuccessfulRequests: true,
  skip: (req) => isLocal(req),
});

/**
 * Upload rate limiter
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 1000 : 30,
  message: {
    success: false,
    message: 'Too many uploads, please try again later'
  },
  skip: (req) => isLocal(req),
});

