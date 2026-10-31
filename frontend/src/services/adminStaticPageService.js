import api from './api';

const adminStaticPageService = {
  /**
   * Get static page content by slug
   * @param {string} slug - Page slug (terms-and-condition or privacy-policy)
   * @returns {Promise} Response with page data
   */
  getStaticPage: async (slug) => {
    try {
      const response = await api.get(`/static-pages/${slug}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update static page content
   * @param {Object} pageData - { slug, title, content }
   * @returns {Promise} Response
   */
  updateStaticPage: async (pageData) => {
    try {
      const response = await api.post('/admin/static-pages/update', pageData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get app links (public)
   * @returns {Promise} Response with { links: { playStoreUrl, appStoreUrl } }
   */
  getAppLinks: () => api.get('/static-pages/app-links'),

  /**
   * Update app links
   * @param {Object} links - { playStoreUrl, appStoreUrl }
   * @returns {Promise} Response
   */
  updateAppLinks: (links) => api.post('/admin/static-pages/app-links', links)
};

export default adminStaticPageService;
