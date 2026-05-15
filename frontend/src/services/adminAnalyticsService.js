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

const adminAnalyticsService = {
  getDashboardStats,
  getUserGrowth,
  getContentAnalytics,
  getWatchTimeAnalytics,
  getPlatformHealth
};

export default adminAnalyticsService;
