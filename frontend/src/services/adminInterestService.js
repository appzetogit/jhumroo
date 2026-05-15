import api from './api';

const adminInterestService = {
  getInterests: async () => {
    return await api.get('/interests');
  },

  createInterest: async (data) => {
    return await api.post('/admin/interests', data);
  },

  updateInterest: async (id, data) => {
    return await api.put(`/admin/interests/${id}`, data);
  },

  deleteInterest: async (id) => {
    return await api.delete(`/admin/interests/${id}`);
  }
};

export default adminInterestService;
