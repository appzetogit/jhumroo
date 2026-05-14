import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development/testing
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter (stricter)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for development
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
});

/**
 * OTP rate limiter
 */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased for development
  message: 'Too many OTP requests, please try again later',
  skipSuccessfulRequests: true,
});

/**
 * Upload rate limiter
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many uploads, please try again later',
});
