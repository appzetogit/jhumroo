import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../../../../services/userService';

const highlightText = (text, query) => {
  if (!text || typeof text !== 'string') return '';
  if (!query || !query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <span key={index} className="text-[#FE2C55] font-bold">
        {part}
      </span>
    ) : (
      part
    )
  );
};

const InboxSearchPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Accounts'
  const [usersResults, setUsersResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);

  // Auto focus input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Search users logic debounced
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setUsersResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const userRes = await userService.searchUsers(query);
        if (userRes.success) {
          setUsersResults(userRes.users || []);
        } else {
          setUsersResults([]);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
        setUsersResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasQuery = searchQuery.trim() !== '';
  const hasUsers = usersResults.length > 0;
  const noResults = hasQuery && !loading && !hasUsers;

  return (
    <div className="page-container theme-surface-page flex flex-col h-full relative select-none">
      {/* Header Bar */}
      <div className="flex items-center gap-3 px-3 py-3 shrink-0 theme-panel-card sticky top-0 z-[60] border-b theme-panel-divider">
        <button
          onClick={() => navigate(-1)}
          className="p-1 theme-text-primary active:opacity-60 transition-opacity cursor-pointer"
          title="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex-1 relative flex items-center">
          <div className="absolute left-3.5 pointer-events-none text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts"
            className="w-full bg-[#f1f1f2] dark:bg-white/10 rounded-xl py-2.5 pl-10 pr-9 text-[15px] theme-text-primary outline-none transition-all placeholder:text-gray-400 font-normal caret-[#FE2C55]"
          />
          {hasQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (when user typed query) */}
      {hasQuery && (
        <div className="flex border-b theme-panel-divider shrink-0 px-2 bg-white dark:bg-[#161616]">
          {['All', 'Accounts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[15px] font-bold relative text-center transition-colors cursor-pointer ${
                activeTab === tab ? 'theme-text-primary' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2.5px] bg-black dark:bg-white rounded-full transition-all" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="scrollable flex-1">
        {!hasQuery ? (
          /* Empty state prompt */
          <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
            <p className="text-[15px] text-gray-400 dark:text-gray-500 font-normal leading-relaxed">
              You can search for accounts here.
            </p>
          </div>
        ) : loading ? (
          /* Searching spinner */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FE2C55]"></div>
          </div>
        ) : (
          <div className="pb-24">
            {/* Accounts Section */}
            {hasUsers && (
              <div className="py-2">
                <div className="px-4 py-2">
                  <h3 className="text-[16px] font-extrabold theme-text-primary">Accounts</h3>
                </div>
                <div className="flex flex-col">
                  {usersResults.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => navigate(`/inbox/chat/${user.username}`)}
                      className="flex items-center gap-3.5 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                        {user.profilePicture?.url ? (
                          <img src={user.profilePicture.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold theme-text-primary truncate leading-tight">
                          {highlightText(user.fullName || user.username, searchQuery)}
                        </p>
                        <p className="text-[13px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
                          {highlightText(user.username, searchQuery)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results state */}
            {noResults && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-10">
                <p className="text-[15px] font-bold theme-text-primary">No results found</p>
                <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-1">
                  Try searching for a different account.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxSearchPage;
