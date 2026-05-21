import api from './api';

export const getDashboardStats = async () => {
  return await api.get('/admin/analytics/dashboard');
};

export const getUserGrowth = async (days = 30) => {
  return await api.get(`/admin/analytics/user-growth?days=${days}`);
};

export const getContentAnalytics = async (days = 30) => {
  return await api.get(`/admin/analytics/content?days=${days}`);
};

export const getWatchTimeAnalytics = async (days = 30) => {
  return await api.get(`/admin/analytics/watch-time?days=${days}`);
};

export const getPlatformHealth = async () => {
  return await api.get('/admin/analytics/health');
};

export const getTopUsers = async (metric = 'reels', limit = 5) => {
  return await api.get(`/admin/analytics/top-users?metric=${metric}&limit=${limit}`);
};

export const getReelGeoAnalytics = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await api.get(`/admin/analytics/reel-geo?${query}`);
};

export const getAdsAnalytics = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return await api.get(`/admin/analytics/ads?${query}`);
};

const adminAnalyticsService = {
  getDashboardStats,
  getUserGrowth,
  getContentAnalytics,
  getWatchTimeAnalytics,
  getPlatformHealth,
  getTopUsers,
  getReelGeoAnalytics,
  getAdsAnalytics
};

export default adminAnalyticsService;
