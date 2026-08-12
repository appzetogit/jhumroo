// Run: node src/modules/user/pages/Create/utils/faceWarp.selfcheck.js
// Checks the pure math core of the warp engine (radialSampleFactor) without needing a canvas/DOM.
import assert from 'node:assert';
import { radialSampleFactor } from './faceWarp.js';

// strength 0 must be a no-op at every radius (identity warp).
assert.strictEqual(radialSampleFactor(1, 0), 1, 'strength=0 must not warp at center');
assert.strictEqual(radialSampleFactor(0.5, 0), 1, 'strength=0 must not warp mid-region');

// Region edge (percent=0) must always be identity, regardless of strength, so warps blend seamlessly.
assert.strictEqual(radialSampleFactor(0, 0.8), 1, 'region edge must be seamless for bulge');
assert.strictEqual(radialSampleFactor(0, -0.8), 1, 'region edge must be seamless for pinch');

// Bulge (strength>0): sample point pulls toward center (factor<1) -> center content stretches outward.
assert.ok(radialSampleFactor(0.5, 0.6) < 1, 'positive strength must bulge (factor<1 at mid-region)');

// Pinch (strength<0): sample point pushes away from center (factor>1) -> center content compresses.
assert.ok(radialSampleFactor(0.5, -0.6) > 1, 'negative strength must pinch (factor>1 at mid-region)');

console.log('faceWarp.selfcheck: all assertions passed');
