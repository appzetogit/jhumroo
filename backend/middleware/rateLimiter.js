import rateLimit from 'express-rate-limit';
import { getFastRedis } from '../config/redis.js';
import { verifyAccessToken } from './auth.js';

// Shared counters across PM2 instances when REDIS_URL is set; otherwise express-rate-limit's
// default memory store. Without this each of N processes counts separately (limits become N×).
class RedisStore {
  constructor(prefix) { this.prefix = `jhumroo:rl:${prefix}:`; } // shared VPS Redis: own namespace
  init(options) { this.windowMs = options.windowMs; }
  async increment(key) {
    const redis = getFastRedis(), k = this.prefix + key;
    const totalHits = await redis.incr(k);
    if (totalHits === 1) await redis.pexpire(k, this.windowMs);
    const ttl = await redis.pttl(k);
    return { totalHits, resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)) };
  }
  async decrement(key) { await getFastRedis().decr(this.prefix + key); }
  async resetKey(key) { await getFastRedis().del(this.prefix + key); }
}
// passOnStoreError: Redis down → let the request through instead of failing or hanging it.
const storeFor = (prefix) => (process.env.REDIS_URL ? { store: new RedisStore(prefix), passOnStoreError: true } : {});

// Count per logged-in user, not per IP: Jio/Airtel carrier NAT and office Wi-Fi put many phones
// behind one IP, which used to 429 everyone ("server down"). Anonymous requests still count per IP.
const userOrIp = (req) => {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try { return `u:${verifyAccessToken(h.slice(7)).id}`; } catch { /* bad/expired token → IP */ }
  }
  return req.ip;
};

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
  keyGenerator: userOrIp,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
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
  keyGenerator: userOrIp,
  message: {
    success: false,
    message: 'Too many uploads, please try again later'
  },
  skip: (req) => isLocal(req),
});

