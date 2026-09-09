import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiSearch, BiX, BiTrash, BiUser } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useToast } from '../../../../context/ToastContext';
import {
  getSearchHistory,
  removeSearchItem,
  clearSearchHistory,
} from '../../../../utils/searchHistoryStorage';

const SearchHistoryPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast?.() || { showToast: (msg) => alert(msg) };

  const [history, setHistory] = useState(() => getSearchHistory());
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setHistory(getSearchHistory());
    };
    window.addEventListener('searchHistoryUpdated', handleUpdate);
    return () => {
      window.removeEventListener('searchHistoryUpdated', handleUpdate);
    };
  }, []);

  const handleRemove = (id, e) => {
    e.stopPropagation();
    const updated = removeSearchItem(id);
    setHistory(updated);
    showToast('Search item removed');
  };

  const handleClearAll = () => {
    clearSearchHistory();
    setHistory([]);
    setShowClearModal(false);
    showToast('Search history cleared');
  };

  const handleSearchClick = (item) => {
    const targetUsername =
      item.username ||
      (item.query && item.query.startsWith('@') ? item.query.slice(1) : item.query);
    if (targetUsername) {
      navigate(`/user/${targetUsername}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(item.query || '')}`);
    }
  };

  // Format relative timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      {/* ======================= HEADER ======================= */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 relative">
        <div
          className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
          onClick={() => navigate(-1)}
        >
          <BiChevronLeft size={24} className="theme-text-primary opacity-80" />
        </div>
        <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">
          Search history
        </h2>
        
        {/* Clear All Action in Header */}
        {history.length > 0 ? (
          <button
            onClick={() => setShowClearModal(true)}
            className="text-[13px] font-semibold text-[#FE2C55] active:opacity-75 z-10 cursor-pointer"
          >
            Clear all
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </div>

      {/* ======================= CONTENT AREA ======================= */}
      <div className="scrollable flex-1 px-4 pb-12 pt-2 flex flex-col">
        {history.length === 0 ? (
          /* ======================= EMPTY STATE (Screenshot 4) ======================= */
          <div className="flex-1 flex flex-col items-center justify-center -mt-16 text-center px-6 animate-fade-in">
            {/* Big circular magnifying glass matching Screenshot 4 */}
            <div className="w-24 h-24 mb-6 flex items-center justify-center">
              <svg
                width="84"
                height="84"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400 dark:text-gray-500 opacity-80"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">
              No search history yet
            </h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              Searches you’ve made will appear here.
            </p>
          </div>
        ) : (
          /* ======================= SEARCH HISTORY LIST ======================= */
          <div className="flex flex-col gap-3 animate-fade-in">
            {/* List of search entries */}
            <div className="theme-panel-card rounded-[20px] overflow-hidden shadow-sm">
              {history.map((item, idx) => {
                const isLast = idx === history.length - 1;
                const usernameClean =
                  item.username ||
                  (item.query && item.query.startsWith('@') ? item.query.slice(1) : item.query);
                const title = item.displayName || usernameClean || item.query;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSearchClick(item)}
                    className={`theme-panel-row flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:opacity-75 ${
                      !isLast ? 'border-b theme-panel-divider' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden pr-2">
                      <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={title}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <BiUser size={22} className="text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                          {title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate mt-0.5">
                          {usernameClean && (
                            <span className="truncate">@{usernameClean}</span>
                          )}
                          {usernameClean && item.timestamp && <span>•</span>}
                          {item.timestamp && (
                            <span className="shrink-0">{formatTime(item.timestamp)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleRemove(item.id, e)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 active:scale-90"
                      aria-label="Remove search"
                    >
                      <BiX size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======================= CLEAR ALL CONFIRMATION MODAL ======================= */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#1C1E2E] rounded-[24px] p-6 text-black dark:text-white shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-[#FE2C55] flex items-center justify-center mx-auto mb-3">
              <BiTrash size={24} />
            </div>
            <h4 className="text-[17px] font-bold mb-1.5">Clear all search history?</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              This will remove all searches stored on this device. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 active:scale-98"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-xl font-bold bg-[#FE2C55] text-white active:scale-98 shadow-md shadow-red-500/20"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchHistoryPage;
