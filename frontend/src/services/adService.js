import api from './api';

const adService = {
  createAd: async (formData) => {
    const response = await api.post('/ads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  getMyAds: async () => {
    return await api.get('/ads/me');
  },

  toggleAdStatus: async (adId) => {
    return await api.patch(`/ads/${adId}/toggle`);
  },

  getAdAnalytics: async (adId) => {
    return await api.get(`/ads/${adId}/analytics`);
  },

  getAllAdsAdmin: async () => {
    return await api.get('/ads/admin/all');
  },

  getUserAdsAdmin: async () => {
    return await api.get('/ads/admin/user-ads');
  },

  deleteAd: async (adId) => {
    return await api.delete(`/ads/${adId}`);
  },

  trackView: async (adId) => {
    return await api.post(`/ads/${adId}/view`);
  },

  trackClick: async (adId) => {
    return await api.post(`/ads/${adId}/click`);
  },
  
  getAdById: async (adId) => {
    return await api.get(`/ads/${adId}`);
  },

  updateAdAdmin: async (adId, formData) => {
    return await api.put(`/ads/${adId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

export default adService;
