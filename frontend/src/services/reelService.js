/**
 * Reel Service
 * Handles all reel/video related API calls
 */

import api from './api';

const reelService = {
  /**
   * Get feed reels (for home page)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with reels
   */
  getFeed: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/reels/feed', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get following reels (reels from users being followed)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with reels
   */
  getFollowingReels: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/reels/following/feed', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get reel by ID
   * @param {string} reelId - Reel ID
   * @returns {Promise} Response with reel data
   */
  getReelById: async (reelId) => {
    try {
      const response = await api.get(`/reels/${reelId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new reel (Legacy / Small files)
   * @param {FormData} formData - Form data with video and metadata
   * @returns {Promise} Response with created reel
   */
  createReel: async (formData) => {
    try {
      const response = await api.post('/reels', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get presigned URL for direct S3 upload
   */
  getPresignedUrl: async (fileName, contentType) => {
    try {
      const response = await api.post('/reels/create-upload-url', { fileName, contentType });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Notify backend that S3 upload is complete
   */
  completeUpload: async (uploadData) => {
    try {
      const response = await api.post('/reels/complete-upload', uploadData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update reel
   * @param {string} reelId - Reel ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} Response with updated reel
   */
  updateReel: async (reelId, updateData) => {
    try {
      const response = await api.put(`/reels/${reelId}`, updateData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete reel
   * @param {string} reelId - Reel ID
   * @returns {Promise} Response
   */
  deleteReel: async (reelId) => {
    try {
      const response = await api.delete(`/reels/${reelId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Like/Unlike reel
   * @param {string} reelId - Reel ID
   * @returns {Promise} Response
   */
  toggleLike: async (reelId) => {
    try {
      const response = await api.post(`/reels/${reelId}/like`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Save/Unsave reel
   * @param {string} reelId - Reel ID
   * @returns {Promise} Response
   */
  toggleSave: async (reelId) => {
    try {
      const response = await api.post(`/reels/${reelId}/save`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get reel comments
   * @param {string} reelId - Reel ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with comments
   */
  getComments: async (reelId, page = 1, limit = 20) => {
    try {
      const response = await api.get(`/reels/${reelId}/comments`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Add comment to reel
   * @param {string} reelId - Reel ID
   * @param {string} content - Comment text
   * @param {string} parentCommentId - Parent comment ID (for replies)
   * @returns {Promise} Response with created comment
   */
  addComment: async (reelId, content, parentCommentId = null) => {
    try {
      const response = await api.post(`/reels/${reelId}/comments`, {
        text: content,
        parentCommentId,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get replies for a specific comment
   * @param {string} commentId - Comment ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with replies
   */
  getCommentReplies: async (commentId, page = 1, limit = 20) => {
    try {
      const response = await api.get(`/comments/${commentId}/replies`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Search reels
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Promise} Response with search results
   */
  searchReels: async (query, filters = {}) => {
    try {
      const response = await api.get('/reels/search', {
        params: { q: query, ...filters },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get trending reels
   * @param {number} limit - Number of reels
   * @returns {Promise} Response with trending reels
   */
  getTrending: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/reels/trending', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Like/Unlike a comment or reply
   * @param {string} commentId - Comment/Reply ID
   * @returns {Promise} Response
   */
  toggleCommentLike: async (commentId) => {
    try {
      const response = await api.post(`/comments/${commentId}/like`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Record a view for a reel
   * @param {string} reelId - Reel ID
   * @returns {Promise} Response
   */
  recordView: async (reelId) => {
    try {
      const response = await api.post(`/reels/${reelId}/view`);
      return response;
    } catch (error) {
      // Silently fail for views to avoid impacting UX
      console.error('Failed to record view:', error);
    }
  },

  /**
   * Report a reel
   */
  reportReel: async (reelId, reason, description = '') => {
    try {
      const response = await api.post(`/reels/${reelId}/report`, { reason, description });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's saved collections
   */
  getSavedCollections: async () => {
    try {
      const response = await api.get('/reels/saved/collections');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Share reel (increment share count)
   * @param {string} reelId - Reel ID
   * @returns {Promise} Response
   */
  shareReel: async (reelId) => {
    try {
      const response = await api.post(`/reels/${reelId}/share`);
      return response;
    } catch (error) {
      // Silently fail or log for shares
      console.error('Failed to record share:', error);
      throw error;
    }
  },
};

export default reelService;
