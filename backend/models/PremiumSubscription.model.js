import mongoose from 'mongoose';

const premiumSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    planDurationDays: {
      type: Number,
      default: 30
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'failed'],
      default: 'pending',
      index: true
    },
    razorpayOrderId: {
      type: String,
      default: '',
      index: true
    },
    razorpayPaymentId: {
      type: String,
      default: '',
      index: true
    },
    razorpaySignature: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

premiumSubscriptionSchema.index({ user: 1, createdAt: -1 });

const PremiumSubscription = mongoose.model('PremiumSubscription', premiumSubscriptionSchema);
export default PremiumSubscription;
