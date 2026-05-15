import api from './api';

const adminProblemReportService = {
  /**
   * Get all problem reports
   */
  getProblemReports: async () => {
    try {
      const response = await api.get('/admin/problem-reports/all');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update problem report status
   */
  updateReportStatus: async (id, data) => {
    try {
      const response = await api.patch(`/admin/problem-reports/${id}/status`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default adminProblemReportService;
