import api from './api';

const adminUserService = {
  getAllUsers: async (params) => {
    try {
      return await api.get('/admin/users', { params });
    } catch (error) {
      throw error;
    }
  },

  getUserById: async (id) => {
    try {
      return await api.get(`/admin/users/${id}`);
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (id, userData) => {
    try {
      return await api.put(`/admin/users/${id}`, userData);
    } catch (error) {
      throw error;
    }
  },

  banUser: async (id, banData) => {
    try {
      return await api.put(`/admin/users/${id}/ban`, banData);
    } catch (error) {
      throw error;
    }
  },

  verifyUser: async (id) => {
    try {
      return await api.put(`/admin/users/${id}/verify`);
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (id) => {
    try {
      return await api.delete(`/admin/users/${id}`);
    } catch (error) {
      throw error;
    }
  },
  
  getUserReels: async (id, params) => {
    try {
      return await api.get(`/admin/users/${id}/reels`, { params });
    } catch (error) {
      throw error;
    }
  }
};

export default adminUserService;
