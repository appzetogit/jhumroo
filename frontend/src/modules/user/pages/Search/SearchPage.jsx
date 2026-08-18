import React, { useDeferredValue, useState, useEffect } from 'react';
import { BiSearch, BiX, BiChevronLeft } from 'react-icons/bi';
import { FiPlus } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';
import followService from '../../../../services/followService';

// Default silhouette avatar SVG component matching image 2 & zoomed crop screenshot
const DefaultAvatar = () => (
  <div className="w-full h-full bg-[#d6d9df] flex items-center justify-center">
    <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="37" r="18" fill="#ffffff" />
      <path d="M18 88 C 18 64, 32 54, 50 54 C 68 54, 82 64, 82 88 Z" fill="#ffffff" />
    </svg>
  </div>
);

const SearchPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const deferredQuery = useDeferredValue(searchQuery);

  const [isSearchActive, setIsSearchActive] = useState(() => !!searchQuery.trim());
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const [dbSuggestedUsers, setDbSuggestedUsers] = useState([]);
  const [dbSearchResults, setDbSearchResults] = useState([]);
  const [removedUserIds, setRemovedUserIds] = useState(new Set());

  // Sync isSearchActive with query
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearchActive(true);
    }
  }, [searchQuery]);

  // Fetch suggested users from DB
  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await userService.getSuggestedUsers(15);
        if (res.success && res.users) {
          const formatted = res.users.map((u) => ({
            id: u._id || u.id,
            username: u.username,
            displayName: u.fullName || u.username,
            avatar: u.profilePicture?.url || null,
            followers: u.stats?.followersCount || 0,
            videos: u.stats?.reelsCount || 0,
            isFollowing: u.isFollowing,
            followStatus: u.followStatus,
            subtext: u.bio || (u.fullName ? `You may know ${u.fullName}` : 'Suggested for you'),
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
  useEffect(() => {
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
            id: u._id || u.id,
            username: u.username,
            displayName: u.fullName || u.username,
            avatar: u.profilePicture?.url || null,
            followers: u.stats?.followersCount || 0,
            videos: u.stats?.reelsCount || 0,
            isFollowing: u.isFollowing,
            followStatus: u.followStatus,
            subtext: u.bio || `${u.stats?.followersCount || 0} followers`,
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

  const handleToggleFollow = async (targetUser) => {
    try {
      if (targetUser.isFollowing || targetUser.followStatus === 'pending') {
        const res = await followService.unfollowUser(targetUser.id);
        if (res.success) {
          const updateFn = (list) =>
            list.map((u) =>
              u.id === targetUser.id
                ? { ...u, isFollowing: false, followStatus: null }
                : u
            );
          setDbSearchResults(updateFn);
          setDbSuggestedUsers(updateFn);
        }
      } else {
        const res = await followService.followUser(targetUser.id);
        if (res.success) {
          const newStatus = res.status || 'accepted';
          const updateFn = (list) =>
            list.map((u) =>
              u.id === targetUser.id
                ? {
                    ...u,
                    isFollowing: newStatus === 'accepted',
                    followStatus: newStatus,
                  }
                : u
            );
          setDbSearchResults(updateFn);
          setDbSuggestedUsers(updateFn);
        }
      }
    } catch (err) {
      console.error('Follow action failed:', err);
    }
  };

  const handleRemoveUser = (userId, e) => {
    e.stopPropagation();
    setRemovedUserIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  };

  const handleSearchInputChange = (val) => {
    if (!val) {
      setSearchParams(new URLSearchParams(), { replace: true });
    } else {
      const nextParams = new URLSearchParams();
      nextParams.set('q', val);
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const visibleSuggestedUsers = dbSuggestedUsers.filter(
    (u) => !removedUserIds.has(u.id)
  );

  const currentUserAvatar = currentUser?.profilePicture?.url;

  return (
    <div className="relative w-full h-full min-h-screen bg-black text-white flex flex-col overflow-x-hidden select-none">
      {/* Background stylized dark geometric curves (TikTok style line overlay) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-20">
        <svg className="absolute -right-24 -top-12 w-[460px] h-[700px]" viewBox="0 0 300 500" fill="none">
          <path d="M30 0 C 160 120, 240 300, 140 500" stroke="#25f4ee" strokeWidth="1.8" />
          <path d="M60 0 C 190 140, 270 320, 170 500" stroke="#fe2c55" strokeWidth="1.8" />
          <path d="M90 0 C 220 160, 300 340, 200 500" stroke="#fe2c55" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,var(--safe-area-top))] pb-3 bg-black">
        {isSearchActive ? (
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={handleCloseSearch}
              className="text-white/90 active:opacity-60 p-1"
              aria-label="Back"
            >
              <BiChevronLeft size={28} />
            </button>

            <div className="flex-1 bg-[#1c1c1e] rounded-full flex items-center px-3.5 py-1.5">
              <BiSearch size={18} className="text-white/50 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                autoFocus
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder="Search users"
                className="w-full bg-transparent text-white text-[14px] outline-none placeholder-white/40"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchInputChange('')}
                  className="text-white/50 hover:text-white p-0.5"
                >
                  <BiX size={18} />
                </button>
              )}
            </div>

            <button
              onClick={handleCloseSearch}
              className="text-white text-[15px] font-medium shrink-0 active:opacity-70"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* Left Spacer to keep Friends centered */}
            <div className="w-8 h-8" />

            {/* Center Header Title */}
            <h1 className="text-white font-extrabold text-[20px] tracking-tight">
              Friends
            </h1>

            {/* Right: Search Magnifying Glass Icon */}
            <button
              onClick={() => setIsSearchActive(true)}
              className="text-white p-1 active:opacity-60 transition-opacity"
              aria-label="Search"
            >
              <BiSearch size={24} />
            </button>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto pb-24 scrollbar-none">
        {/* If performing search */}
        {isSearchActive && searchQuery.trim() ? (
          <div>
            {isUsersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dbSearchResults.length === 0 ? (
              <div className="text-center py-16 text-white/50 text-[14px]">
                No users found for "{searchQuery}"
              </div>
            ) : (
              <div className="flex flex-col">
                {dbSearchResults.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onOpenUser={() => navigate(`/user/${user.username}`)}
                    onToggleFollow={() => handleToggleFollow(user)}
                    onRemove={(e) => handleRemoveUser(user.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Main Friends / Suggested view matching Image 2 */
          <div>
            {/* Hero Banner Text */}
            <div className="px-5 pt-3 pb-5">
              <h2 className="text-white text-[27px] font-extrabold leading-[1.15] tracking-tight max-w-[300px]">
                Follow your friends to watch their videos
              </h2>
            </div>

            {/* Users List */}
            <div className="flex flex-col">
              {visibleSuggestedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onOpenUser={() => navigate(`/user/${user.username}`)}
                  onToggleFollow={() => handleToggleFollow(user)}
                  onRemove={(e) => handleRemoveUser(user.id, e)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Single User Row Component matching Image 2 & zoomed crop screenshot
const UserRow = ({ user, onOpenUser, onToggleFollow, onRemove }) => {
  const isFollowing = user.isFollowing;
  const isPending = user.followStatus === 'pending';

  return (
    <div
      onClick={onOpenUser}
      className="flex items-start px-4 py-3.5 cursor-pointer active:bg-white/5 transition-colors"
    >
      {/* Left: Avatar (Exact 82px size & silhouette) */}
      <div className="w-[82px] h-[82px] rounded-full shrink-0 overflow-hidden bg-[#d6d9df] flex items-center justify-center">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ display: user.avatar ? 'none' : 'flex' }}
        >
          <DefaultAvatar />
        </div>
      </div>

      {/* Middle/Right Container: Name, Subtext, Buttons */}
      <div className="flex-1 min-w-0 ml-4">
        <h3 className="text-white font-bold text-[17px] leading-tight truncate">
          {user.displayName}
        </h3>
        <p className="text-[#7d7e83] text-[14px] mt-1 truncate font-normal">
          {user.subtext || `You may know ${user.username}`}
        </p>

        {/* Buttons Row under the text */}
        <div className="flex items-center gap-2.5 mt-2.5">
          <button
            type="button"
            onClick={onRemove}
            className="w-[115px] h-[38px] rounded-full bg-[#202023] hover:bg-[#2c2c30] active:scale-95 text-white text-[14px] font-bold flex items-center justify-center transition-all duration-150 shrink-0"
          >
            Remove
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow();
            }}
            className={`w-[145px] h-[38px] rounded-full text-[14px] font-bold flex items-center justify-center transition-all duration-150 shrink-0 ${
              isPending
                ? 'bg-[#202023] text-white/70 font-semibold'
                : isFollowing
                ? 'bg-[#202023] text-white/70 font-semibold'
                : 'bg-[#fe2c55] active:bg-[#e0264b] active:scale-95 text-white shadow-md'
            }`}
          >
            {isPending ? 'Requested' : isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

