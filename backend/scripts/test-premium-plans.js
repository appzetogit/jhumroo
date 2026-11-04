// Self-check for premium plan expiry: node scripts/test-premium-plans.js
// Uses the real controller helpers with a fake clock (no DB, no Razorpay) to prove each plan
// is active for exactly its days and then drops out of every premium gate.
import assert from 'node:assert/strict';
import { PREMIUM_PLANS, extendPremium, isPremiumActive } from '../modules/premium/controllers/premium.controller.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = new Date('2026-11-04T10:00:00Z');
const at = (ms) => new Date(T0.getTime() + ms);
const fmt = (d) => d.toISOString().replace('T', ' ').slice(0, 16);

assert.deepEqual(
  Object.fromEntries(Object.entries(PREMIUM_PLANS).map(([id, p]) => [id, p.days])),
  { weekly: 7, monthly: 30, halfyearly: 180 },
  'plan durations'
);

for (const [id, plan] of Object.entries(PREMIUM_PLANS)) {
  // Fresh user buys at T0 (what verifyPremiumPayment saves on the user).
  const user = { isPremium: true, premiumExpiresAt: extendPremium({ isPremium: false }, plan.days, T0) };
  assert.equal(user.premiumExpiresAt.getTime(), at(plan.days * DAY).getTime(), `${id}: expiry = buy + ${plan.days}d`);

  assert.ok(isPremiumActive(user, T0), `${id}: active right after purchase`);
  assert.ok(isPremiumActive(user, at((plan.days - 1) * DAY)), `${id}: active on day ${plan.days - 1}`);
  assert.ok(isPremiumActive(user, at(plan.days * DAY - 60_000)), `${id}: active 1 min before expiry`);
  assert.ok(!isPremiumActive(user, at(plan.days * DAY)), `${id}: off exactly at expiry`);
  assert.ok(!isPremiumActive(user, at(plan.days * DAY + HOUR)), `${id}: off 1h after expiry`);
  // isPremium stays true in the DB after expiry; the date alone must switch it off.
  assert.equal(user.isPremium, true);

  // Renew while still active: days stack on the old expiry, nothing is lost.
  const mid = at(2 * DAY);
  const renewed = extendPremium(user, plan.days, mid);
  assert.equal(renewed.getTime(), at(2 * plan.days * DAY).getTime(), `${id}: renew stacks`);

  // Buy again after it lapsed: counts from the new purchase, not the old expiry.
  const late = at(plan.days * DAY + 3 * DAY);
  const rebought = extendPremium(user, plan.days, late);
  assert.equal(rebought.getTime(), late.getTime() + plan.days * DAY, `${id}: re-buy after expiry starts fresh`);

  console.log(`✓ ${plan.label.padEnd(8)} bought ${fmt(T0)} → expires ${fmt(user.premiumExpiresAt)} | active on day ${plan.days - 1}, gone at day ${plan.days}`);
}

// Edge cases every gate depends on.
assert.ok(!isPremiumActive(null), 'no user');
assert.ok(!isPremiumActive({ isPremium: true }), 'premium without expiry date is not active');
assert.ok(!isPremiumActive({ isPremium: false, premiumExpiresAt: at(DAY) }, T0), 'isPremium false wins');
assert.ok(isPremiumActive({ isPremium: true, premiumExpiresAt: at(DAY).toISOString() }, T0), 'ISO string from the API works');

console.log('\nAll premium plan expiry checks passed.');
process.exit(0);
