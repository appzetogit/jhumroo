import api from './api';

const adminReportService = {
  getReports: async (page = 1, limit = 20) => {
    const response = await api.get(`/admin/reports?page=${page}&limit=${limit}`);
    return response.data;
  },

  updateReportStatus: async (reportId, data) => {
    const response = await api.put(`/admin/reports/${reportId}`, data);
    return response.data;
  },

  removeReel: async (reelId, reportId) => {
    const response = await api.post(`/admin/reports/remove-reel/${reelId}`, { reportId });
    return response.data;
  },

  banUser: async (userId, reportId, reason) => {
    const response = await api.post(`/admin/reports/ban-user/${userId}`, { reportId, reason });
    return response.data;
  }
};

export default adminReportService;
