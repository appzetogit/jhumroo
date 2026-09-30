import api from './api';

const syncAccountStorage = (token, user, refreshToken) => {
  if (!user || !token) return;
  try {
    const raw = localStorage.getItem('jhumroo_accounts');
    let accounts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(accounts)) accounts = [];
    const userId = user._id || user.id;
    const userUsername = user.username;
    const userPhone = user.phoneNumber;

    const idx = accounts.findIndex(a => {
      const u = a.user;
      if (!u) return false;
      if (userId && (u._id === userId || u.id === userId)) return true;
      if (userUsername && u.username === userUsername) return true;
      if (userPhone && u.phoneNumber === userPhone) return true;
      return false;
    });

    if (idx !== -1) {
      accounts[idx] = {
        token,
        refreshToken: refreshToken || accounts[idx].refreshToken || '',
        user: { ...accounts[idx].user, ...user },
      };
    } else {
      accounts.push({
        token,
        refreshToken: refreshToken || '',
        user,
      });
    }

    // Deduplicate accounts array
    const seen = new Set();
    const cleanAccounts = [];
    for (const acc of accounts) {
      const u = acc.user;
      if (!u) continue;
      const idKey = u._id ? String(u._id) : (u.id ? String(u.id) : null);
      const usernameKey = u.username ? `u:${u.username}` : null;
      const phoneKey = u.phoneNumber ? `p:${u.phoneNumber}` : null;

      const isDuplicate = 
        (idKey && seen.has(idKey)) || 
        (usernameKey && seen.has(usernameKey)) || 
        (phoneKey && seen.has(phoneKey));

      if (!isDuplicate) {
        if (idKey) seen.add(idKey);
        if (usernameKey) seen.add(usernameKey);
        if (phoneKey) seen.add(phoneKey);
        cleanAccounts.push(acc);
      }
    }

    localStorage.setItem('jhumroo_accounts', JSON.stringify(cleanAccounts));
    localStorage.setItem('jhumroo_active_account_id', userId || userUsername);
  } catch (e) {
    console.error('Failed to sync account storage:', e);
  }
};

const authService = {
  /**
   * Send OTP to phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} countryCode - Country code (default: +91)
   * @returns {Promise} Response with OTP details
   */
  sendOTP: async (phoneNumber, countryCode = '+91', mode = 'unified') => {
    try {
      const response = await api.post('/auth/send-otp', {
        phoneNumber,
        countryCode,
        mode,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify OTP and login
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise} Response with user data and token
   */
  verifyOTP: async (phoneNumber, otp, fcmTokenMobile = '', fcmToken = '') => {
    try {
      const response = await api.post('/auth/verify-otp', {
        phoneNumber,
        otp,
        fcmTokenMobile,
        fcmToken,
      });
      
      // Store token and user data
      if (response.success && response.token) {
        localStorage.setItem('jhumroo_token', response.token);
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
        if (response.refreshToken) {
          localStorage.setItem('jhumroo_refresh_token', response.refreshToken);
        }
        syncAccountStorage(response.token, response.user, response.refreshToken);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Complete user profile after OTP verification
   * @param {Object} profileData - Profile data
   * @returns {Promise} Response with updated user data
   */
  completeProfile: async (profileData) => {
    try {
      const response = await api.post('/auth/complete-profile', profileData);
      
      // Update stored user data
      if (response.success && response.user) {
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
        const currentToken = localStorage.getItem('jhumroo_token');
        const currentRefresh = localStorage.getItem('jhumroo_refresh_token');
        syncAccountStorage(currentToken, response.user, currentRefresh);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check username availability
   * @param {string} username - Username to check
   * @returns {Promise} Response with availability status
   */
  checkUsername: async (username) => {
    try {
      const response = await api.get(`/auth/check-username/${username}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} Response with user data
   */
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      
      // Update stored user data
      if (response.success && response.user) {
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
        const currentToken = localStorage.getItem('jhumroo_token');
        const currentRefresh = localStorage.getItem('jhumroo_refresh_token');
        syncAccountStorage(currentToken, response.user, currentRefresh);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user
   * @returns {Promise} Response
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      
      // Clear stored data
      localStorage.removeItem('jhumroo_token');
      localStorage.removeItem('jhumroo_user');
      localStorage.removeItem('jhumroo_refresh_token');
      
      return response;
    } catch (error) {
      // Clear stored data even if API call fails
      localStorage.removeItem('jhumroo_token');
      localStorage.removeItem('jhumroo_user');
      localStorage.removeItem('jhumroo_refresh_token');
      throw error;
    }
  },

  /**
   * Get auth token from storage
   * @returns {string|null} Auth token
   */
  getToken: () => {
    return localStorage.getItem('jhumroo_token');
  },

  /**
   * Get user data from storage
   * @returns {Object|null} User data
   */
  getUser: () => {
    try {
      const user = localStorage.getItem('jhumroo_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Refresh access token
   * @returns {Promise} Response with new token
   */
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      if (response.success && response.token) {
        localStorage.setItem('jhumroo_token', response.token);
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
        if (response.refreshToken) {
          localStorage.setItem('jhumroo_refresh_token', response.refreshToken);
        }
        syncAccountStorage(response.token, response.user, response.refreshToken);
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user interests
   * @param {string[]} interests - Selected interests
   * @returns {Promise} Response
   */
  updateInterests: async (interests) => {
    try {
      const response = await api.post('/auth/interests', { interests });
      if (response.success && response.user) {
        localStorage.setItem('jhumroo_user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('jhumroo_token');
  },
};

export default authService;
