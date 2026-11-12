import Redis from 'ioredis';

// Redis is optional: without REDIS_URL (local dev) everything runs in one process as before.
// Created lazily because dotenv loads after ES module imports are evaluated.
let client;
export const getRedis = () => {
  if (client === undefined) {
    client = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : null;
    client?.on('error', (err) => console.error('[Redis]', err.message));
  }
  return client;
};

// Rate-limit counters: fail fast when Redis is down or hung (no offline queue, 1s timeout), so requests
// pass instead of waiting forever. getRedis() can't do this: BullMQ needs maxRetriesPerRequest: null.
let fastClient;
export const getFastRedis = () => {
  if (fastClient === undefined) {
    fastClient = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, commandTimeout: 1000 })
      : null;
    fastClient?.on('error', (err) => console.error('[Redis:rl]', err.message));
  }
  return fastClient;
};
