import { Queue } from 'bullmq';
import Reel from '../models/Reel.model.js';
import { processReelWithAudio } from './videoProcessor.js';
import { getFileUrl } from './s3.js';
import { getRedis } from '../config/redis.js';

export const ENCODE_QUEUE = 'reel-encode';
// Own key prefix: the VPS Redis may also hold other projects' BullMQ queues. Queue and Worker must match.
export const QUEUE_PREFIX = 'jhumroo:bull';
const ATTEMPTS = 2;

/**
 * Encode one reel and save the result.
 * data: { reelId, key, music, hd, setThumbnail, fallbackOnFail }
 * fallbackOnFail: on final failure mark the reel completed with its raw URL (legacy upload path).
 */
export const runEncodeJob = async (data, isLastAttempt = true) => {
  const { reelId, key, music, hd, setThumbnail, fallbackOnFail } = data;
  try {
    const processed = await processReelWithAudio(reelId, key, music, { hd });
    await Reel.findByIdAndUpdate(reelId, {
      'video.url': processed.videoUrl,
      'video.publicId': processed.videoKey,
      ...(setThumbnail && { 'video.thumbnail': processed.thumbnailUrl }),
      'video.duration': processed.duration || 0,
      ...(fallbackOnFail && { status: 'completed' })
    });
  } catch (err) {
    console.error(`[encode] reel ${reelId} failed:`, err.message);
    if (!isLastAttempt) throw err; // let BullMQ retry
    if (fallbackOnFail) {
      const reel = await Reel.findById(reelId).select('video.url').lean();
      await Reel.findByIdAndUpdate(reelId, {
        'video.url': reel?.video?.url || (await getFileUrl(key)),
        'video.thumbnail': '',
        status: 'completed'
      });
    }
  }
};

let queue;
/** With Redis: hand the encode to the worker process. Without: run it here (in-process limiter). */
export const enqueueEncode = (data) => {
  const redis = getRedis();
  if (!redis) return runEncodeJob(data).catch(() => {});
  queue ??= new Queue(ENCODE_QUEUE, { connection: redis, prefix: QUEUE_PREFIX });
  return queue.add('encode', { ...data, reelId: String(data.reelId) }, {
    attempts: ATTEMPTS,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }).catch((err) => {
    console.error('[encode] enqueue failed, running in-process:', err.message);
    return runEncodeJob(data).catch(() => {});
  });
};

export const isLastAttempt = (job) => job.attemptsMade + 1 >= (job.opts.attempts || ATTEMPTS);
