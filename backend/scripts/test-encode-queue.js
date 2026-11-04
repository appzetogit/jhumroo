// Self-check for the encode concurrency limit: node scripts/test-encode-queue.js
import assert from 'node:assert/strict';
import { withEncodeSlot } from '../utils/videoProcessor.js';

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
console.log('encode queue OK');
