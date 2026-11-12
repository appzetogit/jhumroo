// Self-check for the encode concurrency limit: node scripts/test-encode-queue.js
import assert from 'node:assert/strict';
import { withEncodeSlot, canCopyVideo } from '../utils/videoProcessor.js';

let active = 0, peak = 0;
const order = [];
const job = (id, ms, fail) => withEncodeSlot(async () => {
  active++; peak = Math.max(peak, active);
  await new Promise((r) => setTimeout(r, ms));
  active--; order.push(id);
  if (fail) throw new Error('boom');
  return id;
});

const results = await Promise.allSettled([job(1, 30), job(2, 5, true), job(3, 5), job(4, 1)]);
assert.equal(peak, 1, 'never more than MAX_CONCURRENT_ENCODES (default 1) at once');
assert.deepEqual(order, [1, 2, 3, 4], 'FIFO order');
assert.equal(results[1].status, 'rejected', 'a failed encode still frees its slot');
assert.equal(results[3].value, 4);
// Stream copy (no x264) only for H.264 within the size cap and a sane bitrate.
const h264 = (width, height) => ({ codec_name: 'h264', width, height });
assert.ok(canCopyVideo(h264(720, 1280), 4_200_000, 720), 'app 720p export → copy');
assert.ok(canCopyVideo(h264(1920, 1080), 6_300_000, 1080), 'rotated/landscape 1080p uses the short side');
assert.ok(!canCopyVideo(h264(1080, 1920), 6_000_000, 720), 'non-premium 1080p → re-encode down to 720');
assert.ok(!canCopyVideo(h264(720, 1280), 12_500_000, 720), 'old app 12 Mbps file → re-encode');
assert.ok(!canCopyVideo({ codec_name: 'hevc', width: 720, height: 1280 }, 3_000_000, 720), 'HEVC → re-encode');
assert.ok(!canCopyVideo(h264(720, 1280), 0, 720) && !canCopyVideo(undefined, 3e6, 720), 'unknown → re-encode');
console.log('encode queue OK');
