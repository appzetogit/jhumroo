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
    const userToken = sessionStorage.getItem('jhumroo_token');
    const adminToken = sessionStorage.getItem('jhumroo_admin_token');
    
    // Distinguish between admin and user requests based on the API endpoint URL
    const isAdminRequest = config.url.includes('/admin/');
    
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
      
      if (status === 401 && !originalRequest._retry) {
        const isAdminRequest = originalRequest.url.includes('/admin/');
        
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
        const refreshToken = isAdminRequest ? sessionStorage.getItem('jhumroo_admin_refresh_token') : null;
        const refreshData = isAdminRequest ? { refreshToken } : {};

        return new Promise(function(resolve, reject) {
          axios.post(refreshUrl, refreshData, { withCredentials: true })
            .then(({data}) => {
              if (data.success && (data.token || data.accessToken)) {
                const newToken = data.token || data.accessToken;
                const tokenKey = isAdminRequest ? 'jhumroo_admin_token' : 'jhumroo_token';
                
                sessionStorage.setItem(tokenKey, newToken);
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
                sessionStorage.removeItem('jhumroo_admin_token');
                sessionStorage.removeItem('jhumroo_admin_refresh_token');
                sessionStorage.removeItem('jhumroo_admin_user');
                window.location.href = '/admin/login';
              } else {
                sessionStorage.removeItem('jhumroo_token');
                sessionStorage.removeItem('jhumroo_user');
                if (!window.location.pathname.includes('/auth')) {
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
