import api from './api';

const adminReportService = {
  getReports: async (page = 1, limit = 20) => {
    return await api.get(`/admin/reports?page=${page}&limit=${limit}`);
  },

  updateReportStatus: async (reportId, data) => {
    return await api.put(`/admin/reports/${reportId}`, data);
  },

  removeReel: async (reelId, reportId) => {
    return await api.post(`/admin/reports/remove-reel/${reelId}`, { reportId });
  },

  banUser: async (userId, reportId, reason) => {
    return await api.post(`/admin/reports/ban-user/${userId}`, { reportId, reason });
  }
};

export default adminReportService;
