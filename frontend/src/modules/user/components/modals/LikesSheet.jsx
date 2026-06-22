import React, { useState, useEffect } from 'react';
import { BiX, BiCheckCircle } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import reelService from '../../../../services/reelService';

const LikesSheet = ({ isOpen, onClose, reelId }) => {
  const { isDarkMode } = useTheme();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);

  const fetchLikers = async () => {
    if (!reelId) return;
    setLoading(true);
    try {
      const response = await reelService.getReelLikers(reelId);
      if (response.success) {
        setUsersList(response.users || []);
        setTotalLikes(response.total || 0);
      }
    } catch (err) {
      console.error("Error fetching reel likers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLikers();
    }
  }, [isOpen, reelId]);

  if (!isOpen) return null;

  const handleUserClick = (username) => {
    onClose();
    if (currentUser && currentUser.username === username) {
      navigate('/profile');
    } else {
      navigate(`/user/${username}`);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-[2000] flex flex-col justify-end touch-none comments-sheet-backdrop ${
        isDarkMode ? 'bg-black/50' : 'bg-black/30 backdrop-blur-[2px]'
      }`}
      data-modal-open="true"
      onClick={onClose}
    >
      <div
        className={`w-full h-[60%] rounded-t-[12px] flex flex-col animate-slide-up touch-auto ${
          isDarkMode
            ? 'bg-[#161823] text-white'
            : 'bg-white text-black shadow-[0_-12px_36px_rgba(15,23,42,0.16)] border-t border-black/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative p-4 border-b flex flex-col items-center shrink-0 ${isDarkMode ? 'border-white/5' : 'border-black/[0.08]'}`}>
          <div className={`w-10 h-1 rounded-full mb-3 shrink-0 ${isDarkMode ? 'bg-white/20' : 'bg-black/15'}`}></div>
          <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {loading ? 'Likes' : `${totalLikes} likes`}
          </h3>
          <button
            className={`absolute right-4 top-4 hover:opacity-70 transition-opacity ${isDarkMode ? 'text-white' : 'text-black/70'}`}
            onClick={onClose}
          >
            <BiX size={24} />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollable no-scrollbar overscroll-contain">
          {loading && usersList.length === 0 ? (
            <div className="flex justify-center py-10 opacity-50 text-sm">Loading likes...</div>
          ) : usersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-50 space-y-2">
              <span className="text-sm">No likes yet.</span>
            </div>
          ) : (
            usersList.map((user) => (
              <div
                key={user._id || user.id}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                  isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
                }`}
                onClick={() => handleUserClick(user.username)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-black/5 bg-gray-200">
                    <img
                      src={
                        user.profilePicture?.url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                      }
                      alt={user.fullName || user.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold">
                        @{user.username}
                      </span>
                      {user.isVerified && (
                        <BiCheckCircle className="text-blue-500" size={16} />
                      )}
                    </div>
                    {user.fullName && (
                      <p className={`text-xs opacity-50`}>
                        {user.fullName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LikesSheet;
