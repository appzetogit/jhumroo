import api from './api';

const adminContentService = {
  getAllReels: async (params) => {
    try {
      return await api.get('/admin/content/reels', { params });
    } catch (error) {
      throw error;
    }
  },

  getReelById: async (id) => {
    try {
      return await api.get(`/admin/content/reels/${id}`);
    } catch (error) {
      throw error;
    }
  },

  deleteReel: async (id, reason) => {
    try {
      return await api.delete(`/admin/content/reels/${id}`, { data: { reason } });
    } catch (error) {
      throw error;
    }
  },

  getAllComments: async (params) => {
    try {
      return await api.get('/admin/content/comments', { params });
    } catch (error) {
      throw error;
    }
  },

  deleteComment: async (id, reason) => {
    try {
      return await api.delete(`/admin/content/comments/${id}`, { data: { reason } });
    } catch (error) {
      throw error;
    }
  },

  getContentStats: async (days = 30) => {
    try {
      return await api.get('/admin/content/stats', { params: { days } });
    } catch (error) {
      throw error;
    }
  },

  getAllSounds: async () => {
    try {
      return await api.get('/admin/content/sounds');
    } catch (error) {
      throw error;
    }
  },

  getAllHashtags: async () => {
    try {
      return await api.get('/admin/content/hashtags');
    } catch (error) {
      throw error;
    }
  },

  getAllLiveUsers: async () => {
    try {
      return await api.get('/admin/content/live');
    } catch (error) {
      throw error;
    }
  }
};

export default adminContentService;
