import api from './api';

export const liveService = {
  // Start a new live stream
  startLive: async (data = {}) => {
    return await api.post('/live/start', data);
  },

  // End an active live stream
  endLive: async (liveId) => {
    return await api.post(`/live/${liveId}/end`, {});
  },

  // Get active live streams
  getActiveLives: async () => {
    return await api.get('/live/active');
  },

  // Get live stream details by ID
  getLiveById: async (liveId) => {
    return await api.get(`/live/${liveId}`);
  },

  // Get comments for live stream
  getLiveComments: async (liveId, limit = 50) => {
    return await api.get(`/live/${liveId}/comments`, { params: { limit } });
  },

  // Get STUN/TURN ICE servers configuration
  getIceServers: async () => {
    return await api.get('/live/ice-servers');
  }
};

export default liveService;
