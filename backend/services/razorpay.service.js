import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret
      });
    } else {
      console.warn('⚠️ Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not found in environment.');
      this.client = null;
    }
  }

  getClient() {
    if (!this.client) {
      this.keyId = process.env.RAZORPAY_KEY_ID;
      this.keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (this.keyId && this.keySecret) {
        this.client = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret
        });
      }
    }
    return this.client;
  }

  /**
   * Create a new order in Razorpay
   * @param {Object} params
   * @param {number} params.amount Amount in INR (will be converted to paise)
   * @param {string} [params.currency='INR']
   * @param {string} [params.receipt]
   * @param {Object} [params.notes]
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const client = this.getClient();
    if (!client) {
      throw new Error('Razorpay client is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: currency || 'INR',
      receipt: receipt ? receipt.toString() : undefined,
      notes
    };

    try {
      const order = await client.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new Error(error?.error?.description || error.message || 'Failed to create Razorpay order');
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param {string} orderId
   * @param {string} paymentId
   * @param {string} signature
   * @returns {boolean}
   */
  verifySignature(orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is missing for signature verification');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`${orderId}|${paymentId}`);
      const generatedSignature = hmac.digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      console.error('Razorpay signature verification error:', error);
      return false;
    }
  }

  /**
   * Fetch payment details by paymentId
   * @param {string} paymentId
   * @returns {Promise<Object>}
   */
  async getPayment(paymentId) {
    const client = this.getClient();
    if (!client) {
      throw new Error('Razorpay client is not configured.');
    }
    return await client.payments.fetch(paymentId);
  }
}

const razorpayService = new RazorpayService();
export default razorpayService;
