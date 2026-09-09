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
        timeout: 60000, // 60 seconds for Cloudinary upload
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
   * Upload an attachment for a problem report
   * @param {FormData} formData - Form data with the file
   * @returns {Promise} Response
   */
  uploadProblemAttachment: async (formData) => {
    try {
      const response = await api.post('/problem-reports/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000, // 90 seconds
      });
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
  
  /**
   * Block or unblock a user
   * @param {string} userId - User ID to block/unblock
   * @returns {Promise} Response
   */
  blockUser: async (userId) => {
    try {
      const response = await api.post(`/users/${userId}/block`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get blocked users list
   */
  getBlockedUsers: async () => {
    try {
      const response = await api.get('/users/me/blocked');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Report a user
   * @param {string} userId - User ID to report
   * @param {string} reason - Reason for report
   * @param {string} description - Optional description
   * @returns {Promise} Response
   */
  reportUser: async (userId, reason, description) => {
    try {
      const response = await api.post(`/users/${userId}/report`, { reason, description });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete user account permanently
   * @returns {Promise} Response
   */
  deleteAccount: async () => {
    try {
      const response = await api.delete('/users/profile');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Block/Unblock commenter
   */
  toggleBlockCommenter: async (userId) => {
    try {
      const response = await api.post(`/users/${userId}/block-commenter`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get blocked commenters list
   */
  getBlockedCommenters: async () => {
    try {
      const response = await api.get('/users/me/blocked-commenters');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get real screen time analytics from backend
   */
  getScreenTime: async (offsetWeeks = 0) => {
    try {
      const response = await api.get('/users/me/screen-time', {
        params: { offsetWeeks }
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Record screen time heartbeat
   */
  recordScreenTimeHeartbeat: async (seconds = 30) => {
    try {
      const response = await api.post('/users/me/screen-time/heartbeat', { seconds });
      return response;
    } catch (error) {
      console.warn('Screen time heartbeat error:', error);
    }
  },

  /**
   * Get user watch history
   */
  getWatchHistory: async (page = 1, limit = 30) => {
    try {
      const response = await api.get('/users/me/watch-history', {
        params: { page, limit }
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Remove single reel from watch history
   */
  removeWatchHistoryItem: async (reelId) => {
    try {
      const response = await api.delete(`/users/me/watch-history/${reelId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Clear all watch history
   */
  clearWatchHistory: async () => {
    try {
      const response = await api.delete('/users/me/watch-history');
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default userService;
