// Search history storage utility

const SEARCH_HISTORY_KEY = 'jhumroo_search_history';
const SEARCH_HISTORY_SETTINGS_KEY = 'jhumroo_search_history_settings';

export const getSearchHistory = () => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading search history:', e);
    return [];
  }
};

export const addSearchItem = (query, extra = {}) => {
  if (!query || !query.trim()) return;
  const cleanQuery = query.trim();

  // Check if history recording is paused
  const settings = getSearchHistorySettings();
  if (settings.paused) return;

  try {
    const current = getSearchHistory();
    // Remove duplicate of same username or query if exists
    const filtered = current.filter((item) => {
      if (extra.username && item.username) {
        return item.username.toLowerCase() !== extra.username.toLowerCase();
      }
      return item.query.toLowerCase() !== cleanQuery.toLowerCase();
    });

    const newItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      query: cleanQuery,
      timestamp: new Date().toISOString(),
      type: extra.type || 'user',
      avatar: extra.avatar || null,
      displayName: extra.displayName || null,
      username: extra.username || null,
    };

    // Keep max 50 items
    const updated = [newItem, ...filtered].slice(0, 50);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    
    // Dispatch custom event for reactive updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: updated }));
    }

    return newItem;
  } catch (e) {
    console.error('Error adding search item:', e);
  }
};

export const removeSearchItem = (id) => {
  try {
    const current = getSearchHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: updated }));
    }
    return updated;
  } catch (e) {
    console.error('Error removing search item:', e);
    return [];
  }
};

export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchHistoryUpdated', { detail: [] }));
    }
  } catch (e) {
    console.error('Error clearing search history:', e);
  }
};

export const getSearchHistorySettings = () => {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_SETTINGS_KEY);
    if (!raw) return { paused: false };
    return JSON.parse(raw);
  } catch {
    return { paused: false };
  }
};

export const setSearchHistorySettings = (settings) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_SETTINGS_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchHistorySettingsUpdated', { detail: settings }));
    }
  } catch (e) {
    console.error('Error saving search history settings:', e);
  }
};

export default {
  getSearchHistory,
  addSearchItem,
  removeSearchItem,
  clearSearchHistory,
  getSearchHistorySettings,
  setSearchHistorySettings,
};
