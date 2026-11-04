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
