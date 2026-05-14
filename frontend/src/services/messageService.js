/**
 * Message Service
 * Handles all messaging related API calls
 */

import api from './api';

const messageService = {
  /**
   * Get all conversations
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with conversations
   */
  getConversations: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/messages/conversations', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get conversation with specific user
   * @param {string} userId - User ID
   * @returns {Promise} Response with conversation
   */
  getConversation: async (userId) => {
    try {
      const response = await api.get(`/messages/conversation/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get messages in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with messages
   */
  getMessages: async (conversationId, page = 1, limit = 50) => {
    try {
      const response = await api.get(`/messages/${conversationId}`, {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Send message
   * @param {Object} data - Message data { receiverId, messageType, text, reelId }
   * @returns {Promise} Response with sent message
   */
  sendMessage: async (data) => {
    try {
      const response = await api.post('/messages/send', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Send media message (image or video)
   * @param {FormData} data - Form data with file
   * @param {string} type - 'image' or 'video'
   * @returns {Promise} Response with sent message
   */
  sendMediaMessage: async (data, type = 'image') => {
    try {
      const response = await api.post(`/messages/send/${type}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark conversation as read
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Response
   */
  markAsRead: async (conversationId) => {
    try {
      const response = await api.put(`/messages/conversation/${conversationId}/read`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Response
   */
  deleteConversation: async (conversationId) => {
    try {
      const response = await api.delete(`/messages/conversation/${conversationId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete specific message
   * @param {string} messageId - Message ID
   * @returns {Promise} Response
   */
  deleteMessage: async (messageId) => {
    try {
      const response = await api.delete(`/messages/${messageId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Search conversations
   * @param {string} query - Search query
   * @returns {Promise} Response with search results
   */
  searchConversations: async (query) => {
    try {
      const response = await api.get('/messages/search', {
        params: { q: query },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default messageService;
