import api from './api';

const premiumService = {
  /**
   * Get plan details and user premium status
   */
  getPlan: async () => {
    return await api.get('/premium/plan');
  },

  /**
   * Create Razorpay order to buy premium
   */
  createOrder: async () => {
    return await api.post('/premium/create-order');
  },

  /**
   * Verify Razorpay payment
   */
  verifyPayment: async (paymentData) => {
    return await api.post('/premium/verify-payment', paymentData);
  },

  /**
   * Admin: Get current premium monthly price
   */
  getPricingAdmin: async () => {
    return await api.get('/premium/admin/pricing');
  },

  /**
   * Admin: Update premium monthly price
   */
  updatePricingAdmin: async (pricingData) => {
    return await api.put('/premium/admin/pricing', pricingData);
  },

  /**
   * Admin: Get all premium users and subscriptions
   */
  getPremiumUsersAdmin: async (params = {}) => {
    return await api.get('/premium/admin/users', { params });
  },

  /**
   * Admin: Delete a subscription record
   */
  deleteSubscriptionAdmin: async (id) => {
    return await api.delete(`/premium/admin/subscriptions/${id}`);
  }
};

export default premiumService;
