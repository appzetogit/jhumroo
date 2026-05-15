import api from './api';

const adminSupportService = {
  /**
   * Get all support requests
   * @returns {Promise} Response with requests
   */
  getSupportRequests: async () => {
    try {
      const response = await api.get('/admin/support-requests/all');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update support request status
   * @param {string} requestId - ID of the request
   * @param {Object} updateData - Status and adminNotes
   * @returns {Promise} Response
   */
  updateRequestStatus: async (requestId, updateData) => {
    try {
      const response = await api.patch(`/admin/support-requests/${requestId}/status`, updateData);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default adminSupportService;
