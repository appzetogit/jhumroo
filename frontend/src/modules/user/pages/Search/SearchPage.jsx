import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import { BiChevronLeft, BiMicrophone, BiSearch, BiX } from 'react-icons/bi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSearchResults, normalizeSearchQuery } from '../../../../utils/searchUtils';
import { useAppContent } from '../../../../hooks/useAppContent';
import userService from '../../../../services/userService';

const SEARCH_HISTORY_KEY = 'searchHistory';

const readSearchHistory = () => {
  try {
    const storedValue = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const persistSearchHistory = (query) => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    return;
  }

  const nextHistory = [
    normalizedQuery,
    ...readSearchHistory().filter((item) => item.toLowerCase() !== normalizedQuery.toLowerCase()),
  ].slice(0, 8);

  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
};

const removeSearchHistoryEntry = (query) => {
  const loweredQuery = query.toLowerCase();
  const nextHistory = readSearchHistory().filter((item) => item.toLowerCase() !== loweredQuery);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
};

const ResultsEmptyState = ({ title, subtitle }) => (
  <div className="px-5 py-16 text-center">
    <p className="theme-text-primary text-[15px] font-semibold">{title}</p>
    <p className="theme-text-muted text-[12px] mt-2">{subtitle}</p>
  </div>
);

const UsersResultList = ({ users, isFollowingUser, isFollowerOfMe, onToggleFollow, onOpenUser, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fe2c55] animate-bounce [animation-delay:-0.12s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#25f4ee] animate-bounce [animation-delay:0s]" />
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <ResultsEmptyState
        title="No users found"
        subtitle="Try a different username or display name."
      />
    );
  }

  return (
    <div className="pb-24">
      {users.map((user) => {
        const isFollowing = isFollowingUser(user.username);
        const isFollower = isFollowerOfMe(user.username);
        const showFollowing = isFollowing || isFollower;

        return (
          <div
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-white/5 transition-colors"
            onClick={() => onOpenUser(user.username)}
          >
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-12 h-12 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="theme-text-primary text-[14px] font-semibold truncate">{user.username}</p>
              <p className="theme-text-muted text-[12px] truncate">{user.displayName}</p>
              <p className="theme-text-muted text-[12px] truncate">
                {user.followers} followers · {user.videos} videos
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFollow(user.username);
              }}
              className={`min-w-[76px] rounded-[3px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                showFollowing
                  ? 'bg-white/5 text-white/70 border border-white/10'
                  : 'bg-[#fe2c55] text-white'
              }`}
            >
              {showFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const SearchPage = () => {
  const navigate = useNavigate();
  const { config, isFollowingUser, isFollowerOfMe, toggleFollowUser } = useAppContent();
  const searchConfig = config?.search || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchHistory, setSearchHistory] = useState(() => readSearchHistory());
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const usersLoaderTimeoutRef = useRef(null);
  const searchQuery = searchParams.get('q') || '';
  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const isResultsState = normalizedQuery.length > 0;

  const [dbSuggestedUsers, setDbSuggestedUsers] = useState([]);
  const [dbSearchResults, setDbSearchResults] = useState([]);

  // Fetch suggested users from DB
  React.useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await userService.getSuggestedUsers(10);
        if (res.success && res.users) {
          const formatted = res.users.map((u) => ({
            id: u._id,
            username: u.username,
            displayName: u.fullName || u.username,
            avatar: u.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&style=circle`,
            followers: u.stats?.followersCount || 0,
            videos: u.stats?.reelsCount || 0,
          }));
          setDbSuggestedUsers(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch suggested users:', err);
      }
    };
    fetchSuggested();
  }, []);

  // Fetch search results from DB
  React.useEffect(() => {
    const fetchSearchResults = async () => {
      if (!deferredQuery.trim()) {
        setDbSearchResults([]);
        return;
      }
      setIsUsersLoading(true);
      try {
        const res = await userService.searchUsers(deferredQuery.trim());
        if (res.success && res.users) {
          const formatted = res.users.map((u) => ({
            id: u._id,
            username: u.username,
            displayName: u.fullName || u.username,
            avatar: u.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&style=circle`,
            followers: u.stats?.followersCount || 0,
            videos: u.stats?.reelsCount || 0,
          }));
          setDbSearchResults(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch search results:', err);
      } finally {
        setIsUsersLoading(false);
      }
    };
    fetchSearchResults();
  }, [deferredQuery]);

  const searchResults = { users: dbSearchResults.length > 0 ? dbSearchResults : [] };
  const suggestedUsers = dbSuggestedUsers.length > 0 ? dbSuggestedUsers : (searchConfig.users || []).slice(0, 10);

  const clearUsersLoader = () => {
    if (usersLoaderTimeoutRef.current) {
      window.clearTimeout(usersLoaderTimeoutRef.current);
      usersLoaderTimeoutRef.current = null;
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleDraftChange = (nextValue) => {
    clearUsersLoader();
    setIsUsersLoading(false);

    const trimmedValue = nextValue.trim();
    if (!trimmedValue) {
      setSearchParams(new URLSearchParams(), { replace: true });
      return;
    }

    const nextParams = new URLSearchParams();
    nextParams.set('q', normalizeSearchQuery(nextValue));
    setSearchParams(nextParams, { replace: true });
  };

  const handleSubmitSearch = (nextValue = searchQuery) => {
    const normalizedValue = normalizeSearchQuery(nextValue);
    if (!normalizedValue) {
      return;
    }

    persistSearchHistory(normalizedValue);
    setSearchHistory(readSearchHistory());

    const nextParams = new URLSearchParams();
    nextParams.set('q', normalizedValue);
    setSearchParams(nextParams);
  };

  const handleClearSearch = () => {
    clearUsersLoader();
    setIsUsersLoading(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleToggleFollow = (username) => {
    toggleFollowUser(username);
  };

  return (
    <div className="page-container theme-surface-page flex flex-col overflow-hidden">
      <div className="theme-page-header flex items-center gap-3 px-4 pt-[max(0.75rem,var(--safe-area-top))] pb-3 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center theme-text-primary active:opacity-60 shrink-0"
        >
          <BiChevronLeft size={22} />
        </button>

        <div className="theme-input-shell flex-1 min-w-0 rounded-[6px] flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => handleSubmitSearch(searchQuery)}
            disabled={!normalizedQuery}
            className={`shrink-0 ${normalizedQuery ? 'theme-text-primary active:opacity-70' : 'theme-text-muted/60'}`}
            aria-label="Search users"
          >
            <BiSearch size={18} />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSubmitSearch(event.currentTarget.value);
              }
            }}
            placeholder="Search users"
            className="flex-1 min-w-0 bg-transparent text-[15px] outline-none"
          />
          {normalizedQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="theme-text-muted shrink-0 active:opacity-60"
              aria-label="Clear search"
            >
              <BiX size={18} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleSubmitSearch(searchQuery)}
          disabled={!normalizedQuery}
          className={`text-[15px] font-semibold shrink-0 ${
            normalizedQuery ? 'text-[#fe2c55]' : 'text-[#fe2c55]/40'
          }`}
        >
          Search
        </button>
      </div>

      <div className="scrollable flex-1">
        {!isResultsState && (
          <div className="px-4 pt-3 pb-24">
            {searchHistory.length > 0 ? (
              <div className="mb-4">
                <h2 className="theme-text-primary text-[15px] font-bold mb-2">Recent searches</h2>
                <div className="space-y-1">
                  {searchHistory.map((item) => (
                    <div key={item} className="flex items-center justify-between py-1.5">
                      <button
                        type="button"
                        className="theme-text-primary text-[14px] text-left truncate"
                        onClick={() => handleSubmitSearch(item)}
                      >
                        {item}
                      </button>
                      <button
                        type="button"
                        className="theme-text-muted text-[12px]"
                        onClick={() => {
                          removeSearchHistoryEntry(item);
                          setSearchHistory(readSearchHistory());
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <h2 className="theme-text-primary text-[15px] font-bold mb-3">Suggested users</h2>
            <UsersResultList
              users={suggestedUsers}
              isFollowingUser={isFollowingUser}
              isFollowerOfMe={isFollowerOfMe}
              onToggleFollow={handleToggleFollow}
              onOpenUser={(username) => navigate(`/user/${username}`)}
              isLoading={false}
            />
          </div>
        )}

        {isResultsState && (
          <UsersResultList
            users={searchResults.users}
            isFollowingUser={isFollowingUser}
            isFollowerOfMe={isFollowerOfMe}
            onToggleFollow={handleToggleFollow}
            onOpenUser={(username) => navigate(`/user/${username}`)}
            isLoading={isUsersLoading}
          />
        )}
      </div>
    </div>
  );
};

export default SearchPage;
