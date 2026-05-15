/**
 * User Service
 * Handles all user related API calls
 */

import api from './api';

const userService = {
  /**
   * Get user profile by username
   * @param {string} username - Username
   * @returns {Promise} Response with user profile
   */
  getUserByUsername: async (username) => {
    try {
      const response = await api.get(`/users/${username}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} updateData - Data to update
   * @returns {Promise} Response with updated user
   */
  updateProfile: async (updateData) => {
    try {
      const response = await api.put('/users/profile', updateData);
      
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
   * Upload profile picture
   * @param {FormData} formData - Form data with image
   * @returns {Promise} Response with updated user
   */
  uploadProfilePicture: async (formData) => {
    try {
      const response = await api.post('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
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
   * Get user's reels
   * @param {string} username - Username
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with user's reels
   */
  getUserReels: async (username, page = 1, limit = 12) => {
    try {
      const response = await api.get(`/users/${username}/reels`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's liked reels
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with liked reels
   */
  getLikedReels: async (page = 1, limit = 12) => {
    try {
      const response = await api.get('/users/me/liked-reels', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's saved reels
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with saved reels
   */
  getSavedReels: async (page = 1, limit = 12) => {
    try {
      const response = await api.get('/users/me/saved-reels', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Search users
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with search results
   */
  searchUsers: async (query, page = 1, limit = 20) => {
    try {
      const response = await api.get('/users/search', {
        params: { q: query, page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get suggested users to follow
   * @param {number} limit - Number of users
   * @returns {Promise} Response with suggested users
   */
  getSuggestedUsers: async (limit = 10) => {
    try {
      const response = await api.get('/users/suggested', {
        params: { limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Get user preferences
   */
  getPreferences: async () => {
    try {
      const response = await api.get('/users/me/preferences');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (preferences) => {
    try {
      const response = await api.put('/users/me/preferences', preferences);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark content as interested
   */
  markInterested: async (topics) => {
    try {
      const response = await api.post('/users/me/preferences/interested', { topics });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark content as not interested
   */
  markNotInterested: async (data) => {
    try {
      const response = await api.post('/users/me/preferences/not-interested', data);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Update FCM tokens for push notifications
   * @param {Object} tokens - FCM tokens
   * @returns {Promise} Response
   */
  updateFCMToken: async (tokens) => {
    try {
      const response = await api.post('/users/fcm-token', tokens);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user mention suggestions
   * @param {string} query - Suggestion query
   * @returns {Promise} Response with suggestions
   */
  getMentionSuggestions: async (query) => {
    try {
      const response = await api.get('/users/mentions/suggestions', {
        params: { q: query },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submit a problem report
   * @param {Object} reportData - Report data (category, description, attachments)
   * @returns {Promise} Response
   */
  submitProblemReport: async (reportData) => {
    try {
      const response = await api.post('/problem-reports', reportData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user's problem reports
   * @returns {Promise} Response with reports
   */
  getMyProblemReports: async () => {
    try {
      const response = await api.get('/problem-reports/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submit a support request
   * @param {Object} supportData - Support data (name, email, phoneNumber, reason)
   * @returns {Promise} Response
   */
  submitSupportRequest: async (supportData) => {
    try {
      const response = await api.post('/support-requests', supportData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user's support requests
   * @returns {Promise} Response with requests
   */
  getMySupportRequests: async () => {
    try {
      const response = await api.get('/support-requests/me');
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default userService;
