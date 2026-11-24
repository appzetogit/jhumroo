import mongoose from 'mongoose';
import User from './User.model.js';

// OTP for a number that has no account yet. The User row is created only when the
// profile is completed (POST /auth/complete-profile); abandoned signups expire here.
const pendingSignupSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  countryCode: { type: String, default: '+91' },
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 } // TTL: Mongo deletes it after 1h
});

// Same OTP rules as existing users (expiry, 5-try burn, test numbers).
pendingSignupSchema.methods.generateOTP = User.schema.methods.generateOTP;
pendingSignupSchema.methods.verifyOTP = User.schema.methods.verifyOTP;
pendingSignupSchema.methods.clearOTP = User.schema.methods.clearOTP;

export default mongoose.model('PendingSignup', pendingSignupSchema);
