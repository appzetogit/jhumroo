// Self-check for the signup-token guard (no DB needed): node scripts/check-signup-token.js
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
process.env.JWT_SECRET ||= 'check-secret';
const { protectOrSignup, verifyAccessToken } = await import('../middleware/auth.js');

const run = (token) => new Promise((resolve) => {
  const req = { headers: { authorization: `Bearer ${token}` }, originalUrl: '/api/auth/complete-profile' };
  const res = { status(c) { this.code = c; return this; }, json(b) { resolve({ req, code: this.code, body: b }); } };
  protectOrSignup(req, res, () => resolve({ req, next: true }));
});

const sign = (exp) => jwt.sign({ type: 'signup', phoneNumber: '9876543210', countryCode: '+91' }, process.env.JWT_SECRET, { expiresIn: exp });

const ok = await run(sign('30m'));
assert.ok(ok.next, 'valid signup token reaches the controller');
assert.ok(ok.req.signup && ok.req.user.isNew, 'controller gets an unsaved user');
assert.strictEqual(ok.req.user.phoneNumber, '9876543210');

const expired = await run(sign(-10));
assert.strictEqual(expired.code, 401);
assert.strictEqual(expired.body.code, 'SIGNUP_EXPIRED');

assert.throws(() => verifyAccessToken(sign('30m')), 'signup token must not work as an access token');

const plain = await run('garbage');
assert.strictEqual(plain.code, 401, 'non-signup tokens fall through to protect');

console.log('signup token checks passed');
process.exit(0);
