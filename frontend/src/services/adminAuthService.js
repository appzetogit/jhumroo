import api from './api';

const adminAuthService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/admin/auth/login', { email, password });
      if (response.success && response.accessToken) {
        localStorage.setItem('jhumroo_admin_token', response.accessToken);
        localStorage.setItem('jhumroo_admin_refresh_token', response.refreshToken);
        localStorage.setItem('jhumroo_admin_user', JSON.stringify(response.admin));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('jhumroo_admin_refresh_token');
      await api.post('/admin/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Admin logout error:', error);
    } finally {
      localStorage.removeItem('jhumroo_admin_token');
      localStorage.removeItem('jhumroo_admin_refresh_token');
      localStorage.removeItem('jhumroo_admin_user');
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/admin/auth/me');
      if (response.success && response.admin) {
        localStorage.setItem('jhumroo_admin_user', JSON.stringify(response.admin));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      return await api.put('/admin/auth/change-password', { currentPassword, newPassword });
    } catch (error) {
      throw error;
    }
  },

  isAdminAuthenticated: () => {
    return !!localStorage.getItem('jhumroo_admin_token');
  },

  getAdminToken: () => {
    return localStorage.getItem('jhumroo_admin_token');
  },

  getAdminUser: () => {
    const user = localStorage.getItem('jhumroo_admin_user');
    return user ? JSON.parse(user) : null;
  }
};

export default adminAuthService;
