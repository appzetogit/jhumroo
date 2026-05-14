import api from './api';

const audioService = {
  getAllAudios: async (params) => {
    try {
      const response = await api.get('/audios', { params });
      return response.audios;
    } catch (error) {
      throw error;
    }
  },

  getAudioById: async (id) => {
    try {
      const response = await api.get(`/audios/${id}`);
      return response.audio;
    } catch (error) {
      throw error;
    }
  },

  // Admin operations
  createAudio: async (audioData) => {
    try {
      return await api.post('/audios', audioData);
    } catch (error) {
      throw error;
    }
  },

  updateAudio: async (id, audioData) => {
    try {
      return await api.put(`/audios/${id}`, audioData);
    } catch (error) {
      throw error;
    }
  },

  deleteAudio: async (id) => {
    try {
      return await api.delete(`/audios/${id}`);
    } catch (error) {
      throw error;
    }
  },

  toggleSaveAudio: async (id) => {
    try {
      const response = await api.post(`/audios/${id}/save`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getSavedAudios: async () => {
    try {
      const response = await api.get('/audios/saved');
      return response.audios;
    } catch (error) {
      throw error;
    }
  }
};

export default audioService;
