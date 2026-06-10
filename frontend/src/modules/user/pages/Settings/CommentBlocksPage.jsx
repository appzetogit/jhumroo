import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiSearch } from 'react-icons/bi';
import userService from '../../../../services/userService';

const CommentBlocksPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBlockedCommenters = async () => {
    try {
      setLoading(true);
      const response = await userService.getBlockedCommenters();
      if (response.success) {
        setBlockedUsers(response.users || []);
      } else {
        setError(response.message || 'Failed to load blocked accounts');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching blocked accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedCommenters();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return blockedUsers;
    }

    return blockedUsers.filter((user) =>
      [user.fullName, user.username].join(' ').toLowerCase().includes(query),
    );
  }, [blockedUsers, searchQuery]);

  const handleUnblock = async (userId) => {
    try {
      const response = await userService.toggleBlockCommenter(userId);
      if (response.success && !response.isBlocked) {
        // Successfully unblocked (isBlocked is false)
        setBlockedUsers((prev) => prev.filter((user) => user._id !== userId));
      }
    } catch (err) {
      console.error('Failed to unblock commenter:', err);
    }
  };

  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-4 pt-6 pb-6 shrink-0 relative border-b border-white/5">
        <div
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
          onClick={() => navigate(-1)}
        >
          <BiChevronLeft size={24} className="text-white" />
        </div>
        <h2 className="text-[17px] font-bold text-white absolute left-0 right-0 text-center tracking-wide">
          Comment blocked
        </h2>
        <div className="w-10" />
      </div>

      <div className="scrollable flex-1 px-4 pb-24 pt-6">
        <p className="text-[13px] leading-6 text-white/45 mb-4 px-1">
          Users blocked from commenting cannot post any comments on your videos. They will see the comment field disabled.
        </p>

        <div className="rounded-[18px] bg-white/6 border border-white/10 px-4 py-3 flex items-center gap-3 mb-5">
          <BiSearch size={18} className="text-white/45" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search comment-blocked users"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 opacity-55 text-sm text-white">Loading...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 text-sm">{error}</div>
        ) : filteredUsers.length > 0 ? (
          <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
            {filteredUsers.map((user, index) => {
              const isLast = index === filteredUsers.length - 1;

              return (
                <div
                  key={user._id}
                  className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 bg-black/20">
                    <img
                      src={user.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{user.fullName || user.username}</p>
                    <p className="text-[12px] text-white/45 truncate">@{user.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(user._id)}
                    className="px-4 py-2 rounded-full border border-white/15 text-[12px] font-semibold text-white active:bg-white/5 transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#242424] rounded-[18px] px-5 py-12 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-white">No comment-blocked accounts found</p>
            <p className="text-[12px] text-white/40 mt-2">
              Comment-blocked accounts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentBlocksPage;
