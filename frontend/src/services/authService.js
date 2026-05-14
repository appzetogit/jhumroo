/**
 * Authentication Service
 * Handles all authentication related API calls
 */

import api from './api';

const authService = {
  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} countryCode - Country code (default: +91)
   * @returns {Promise} Response with OTP details
   */
  sendOTP: async (phoneNumber, countryCode = '+91', mode = 'signup') => {
    try {
      const response = await api.post('/auth/send-otp', {
        phoneNumber,
        countryCode,
        mode,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify OTP and login
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise} Response with user data and token
   */
  verifyOTP: async (phoneNumber, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', {
        phoneNumber,
        otp,
      });
      
      // Store token and user data
      if (response.success && response.token) {
        localStorage.setItem('jhumroo_token', response.token);
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Complete user profile after OTP verification
   * @param {Object} profileData - Profile data
   * @returns {Promise} Response with updated user data
   */
  completeProfile: async (profileData) => {
    try {
      const response = await api.post('/auth/complete-profile', profileData);
      
      // Update stored user data
      if (response.success && response.user) {
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check username availability
   * @param {string} username - Username to check
   * @returns {Promise} Response with availability status
   */
  checkUsername: async (username) => {
    try {
      const response = await api.get(`/auth/check-username/${username}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} Response with user data
   */
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      
      // Update stored user data
      if (response.success && response.user) {
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user
   * @returns {Promise} Response
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      
      // Clear stored data
      localStorage.removeItem('jhumroo_token');
      localStorage.removeItem('jhumroo_user');
      
      return response;
    } catch (error) {
      // Clear stored data even if API call fails
      localStorage.removeItem('jhumroo_token');
      localStorage.removeItem('jhumroo_user');
      throw error;
    }
  },

  /**
   * Get auth token from storage
   * @returns {string|null} Auth token
   */
  getToken: () => {
    return localStorage.getItem('jhumroo_token');
  },

  /**
   * Get user data from storage
   * @returns {Object|null} User data
   */
  getUser: () => {
    const user = localStorage.getItem('jhumroo_user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Refresh access token
   * @returns {Promise} Response with new token
   */
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      if (response.success && response.token) {
        localStorage.setItem('jhumroo_token', response.token);
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user interests
   * @param {string[]} interests - Selected interests
   * @returns {Promise} Response
   */
  updateInterests: async (interests) => {
    try {
      const response = await api.post('/auth/interests', { interests });
      if (response.success && response.user) {
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('jhumroo_token');
  },
};

export default authService;
