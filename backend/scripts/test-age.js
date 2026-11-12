// Self-check for the signup age gate: node scripts/test-age.js
import assert from 'node:assert/strict';
import { isAdult } from '../utils/age.js';

const now = new Date('2026-11-12T10:00:00Z');

assert.ok(isAdult('2008-11-12', now), '18th birthday today → allowed');
assert.ok(!isAdult('2008-11-13', now), 'one day short → blocked');
assert.ok(isAdult('1990-01-01', now), 'adult');
assert.ok(!isAdult('2015-06-01', now), 'child');
assert.ok(!isAdult('2030-01-01', now), 'future date');
assert.ok(!isAdult('2000-02-31', now), 'impossible date');
assert.ok(!isAdult('hello', now) && !isAdult('', now) && !isAdult(undefined, now) && !isAdult(null, now), 'garbage');
assert.ok(isAdult('1986-08-22T18:30:00.000Z', now), 'old app builds send an ISO timestamp');
// 29 Feb 2008 turns 18 on 1 Mar 2026 (2026 is not a leap year).
assert.ok(!isAdult('2008-02-29', new Date('2026-02-28T12:00:00Z')), 'leap baby, 28 Feb');
assert.ok(isAdult('2008-02-29', new Date('2026-03-01T00:00:00Z')), 'leap baby, 1 Mar');

console.log('All age gate checks passed.');
