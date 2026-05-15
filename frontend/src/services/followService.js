/**
 * Follow Service
 * Handles all follow/unfollow related API calls
 */

import api from './api';

const followService = {
  /**
   * Follow a user
   * @param {string} userId - User ID to follow
   * @returns {Promise} Response
   */
  followUser: async (userId) => {
    try {
      const response = await api.post(`/follows/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unfollow a user
   * @param {string} userId - User ID to unfollow
   * @returns {Promise} Response
   */
  unfollowUser: async (userId) => {
    try {
      const response = await api.delete(`/follows/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's followers
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with followers
   */
  getFollowers: async (userId, page = 1, limit = 20) => {
    try {
      const response = await api.get(`/follows/${userId}/followers`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's following
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with following
   */
  getFollowing: async (userId, page = 1, limit = 20) => {
    try {
      const response = await api.get(`/follows/${userId}/following`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if following a user
   * @param {string} userId - User ID
   * @returns {Promise} Response with follow status
   */
  isFollowing: async (userId) => {
    try {
      const response = await api.get(`/follows/check/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get pending follow requests
   * @param {number} page
   * @param {number} limit
   * @returns {Promise}
   */
  getFollowRequests: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/follows/requests/pending', {
        params: { page, limit }
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get pending follow requests count
   * @returns {Promise}
   */
  getFollowRequestsCount: async () => {
    try {
      const response = await api.get('/follows/requests/count');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Accept follow request
   * @param {string} userId
   * @returns {Promise}
   */
  acceptFollowRequest: async (userId) => {
    try {
      const response = await api.put(`/follows/requests/${userId}/accept`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reject follow request
   * @param {string} userId
   * @returns {Promise}
   */
  rejectFollowRequest: async (userId) => {
    try {
      const response = await api.delete(`/follows/requests/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get mutual followers
   * @param {string} userId - User ID
   * @returns {Promise} Response with mutual followers
   */
  getMutualFollowers: async (userId) => {
    try {
      const response = await api.get(`/follows/${userId}/mutual`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default followService;
