import rateLimit from 'express-rate-limit';
import { getRedis } from '../config/redis.js';

// Shared counters across PM2 instances when REDIS_URL is set; otherwise express-rate-limit's
// default memory store. Without this each of N processes counts separately (limits become N×).
class RedisStore {
  constructor(prefix) { this.prefix = `jhumroo:rl:${prefix}:`; } // shared VPS Redis: own namespace
  init(options) { this.windowMs = options.windowMs; }
  async increment(key) {
    const redis = getRedis(), k = this.prefix + key;
    const totalHits = await redis.incr(k);
    if (totalHits === 1) await redis.pexpire(k, this.windowMs);
    const ttl = await redis.pttl(k);
    return { totalHits, resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)) };
  }
  async decrement(key) { await getRedis().decr(this.prefix + key); }
  async resetKey(key) { await getRedis().del(this.prefix + key); }
}
const storeFor = (prefix) => (process.env.REDIS_URL ? { store: new RedisStore(prefix) } : {});

const isDev = process.env.NODE_ENV !== 'production';
const isLocal = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return isDev || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('localhost');
};

/**
 * General API rate limiter
 */
export const rateLimiter = rateLimit({
  ...storeFor('api'),
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
  ...storeFor('auth'),
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
  ...storeFor('otp'),
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
  ...storeFor('upload'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 1000 : 30,
  message: {
    success: false,
    message: 'Too many uploads, please try again later'
  },
  skip: (req) => isLocal(req),
});

