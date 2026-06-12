/**
 * Axios API Configuration
 * Base configuration for all API calls
 */

import axios from 'axios';

// API Base URL - Update this based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const userToken = localStorage.getItem('jhumroo_token');
    const adminToken = localStorage.getItem('jhumroo_admin_token');
    
    // Distinguish between admin and user requests based on the API endpoint URL or browser path (excluding user auth)
    const isAdminRequest = config.url.includes('/admin/') || 
      (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && !config.url.includes('/auth/'));
    
    if (isAdminRequest) {
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else {
      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response.data; // Return only data from response
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      const isBypassRefresh = originalRequest.url.includes('/login') ||
        originalRequest.url.includes('/logout') ||
        originalRequest.url.includes('/refresh') ||
        originalRequest.url.includes('/send-otp') ||
        originalRequest.url.includes('/verify-otp');

      if (status === 401 && !originalRequest._retry && !isBypassRefresh) {
        const isAdminRequest = originalRequest.url.includes('/admin/') || 
          (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && !originalRequest.url.includes('/auth/'));
        
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({resolve, reject});
          }).then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axios(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshUrl = isAdminRequest ? `${API_BASE_URL}/admin/auth/refresh` : `${API_BASE_URL}/auth/refresh-token`;
        const refreshToken = isAdminRequest 
          ? localStorage.getItem('jhumroo_admin_refresh_token') 
          : localStorage.getItem('jhumroo_refresh_token');
        const refreshData = { refreshToken };

        return new Promise(function(resolve, reject) {
          axios.post(refreshUrl, refreshData, { withCredentials: true })
            .then(({data}) => {
              if (data.success && (data.token || data.accessToken)) {
                const newToken = data.token || data.accessToken;
                const tokenKey = isAdminRequest ? 'jhumroo_admin_token' : 'jhumroo_token';
                
                localStorage.setItem(tokenKey, newToken);
                
                if (data.refreshToken) {
                  const refreshKey = isAdminRequest ? 'jhumroo_admin_refresh_token' : 'jhumroo_refresh_token';
                  localStorage.setItem(refreshKey, data.refreshToken);
                }
                
                api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
                originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
                processQueue(null, newToken);
                resolve(api(originalRequest));
              } else {
                throw new Error('Refresh failed');
              }
            })
            .catch((err) => {
              processQueue(err, null);
              if (isAdminRequest) {
                localStorage.removeItem('jhumroo_admin_token');
                localStorage.removeItem('jhumroo_admin_refresh_token');
                localStorage.removeItem('jhumroo_admin_user');
                window.location.href = '/admin/login';
              } else {
                localStorage.removeItem('jhumroo_token');
                localStorage.removeItem('jhumroo_user');
                localStorage.removeItem('jhumroo_refresh_token');
                const isBrowserOnAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
                if (!isBrowserOnAdminRoute && !window.location.pathname.includes('/auth')) {
                  window.location.href = '/auth';
                }
              }
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }
      
      switch (status) {
        case 403:
          if (
            data.message !== 'This account is private' && 
            !data.message?.includes('messages not allowed') && 
            !data.message?.includes('mutual followers')
          ) {
            console.error('Access denied:', data.message);
          }
          break;
        case 404:
          // Do not log 404s globally as they are often expected (e.g., User not found during login)
          break;
        case 500:
          console.error('Server error:', data.message);
          break;
        default:
          // console.error('API Error:', data.message);
      }
      
      return Promise.reject(data);
    } else if (error.request) {
      console.error('Network error - No response from server');
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
      });
    } else {
      console.error('Request error:', error.message);
      return Promise.reject({
        success: false,
        message: error.message,
      });
    }
  }
);

export default api;
