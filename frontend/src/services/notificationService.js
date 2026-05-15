/**
 * Notification Service
 * Handles all notification related API calls
 */

import api from './api';

const notificationService = {
  /**
   * Get all notifications
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Response with notifications
   */
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/notifications', {
        params: { page, limit },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get unread notifications count
   * @returns {Promise} Response with count
   */
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @returns {Promise} Response
   */
  markAsRead: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise} Response
   */
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default notificationService;
