// Background worker: video encodes + hourly cron. Run exactly ONE of these (PM2 app "worker").
//   node worker.js
import dotenv from 'dotenv';
dotenv.config();

const { Worker } = await import('bullmq');
const { default: connectDB } = await import('./config/database.js');
const { getRedis } = await import('./config/redis.js');
const { ENCODE_QUEUE, QUEUE_PREFIX, runEncodeJob, isLastAttempt } = await import('./utils/encodeQueue.js');
const { expireAds } = await import('./cron/ad_expiry.js');

const redis = getRedis();
if (!redis) {
  console.error('worker.js needs REDIS_URL');
  process.exit(1);
}

await connectDB();

// One encode at a time: ffmpeg is the heaviest thing on the box; the API keeps the other cores.
const worker = new Worker(ENCODE_QUEUE, (job) => runEncodeJob(job.data, isLastAttempt(job)), {
  connection: redis,
  prefix: QUEUE_PREFIX,
  concurrency: Number(process.env.ENCODE_CONCURRENCY) || 1,
  lockDuration: 10 * 60 * 1000
});
worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));
console.log('🎬 Encode worker ready');

expireAds();
setInterval(expireAds, 60 * 60 * 1000);
console.log('⏰ Ad expiry cron scheduled (every 1 hour)');

const shutdown = async () => { await worker.close(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
