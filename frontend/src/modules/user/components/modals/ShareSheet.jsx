import React, { useState, useEffect } from 'react';
import { BiX, BiLinkAlt, BiFlag, BiDownload, BiMessageSquareDetail, BiShareAlt } from 'react-icons/bi';
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import messageService from '../../../../services/messageService';
import followService from '../../../../services/followService';
import userService from '../../../../services/userService';

import reelService from '../../../../services/reelService';
import api from '../../../../services/api';

const ShareSheet = ({ isOpen, onClose, reelData, onShare, onReportClick, onNotInterestedClick }) => {
  const { isDarkMode } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null); // 'report' or 'not_interested' or null

  const { user: currentUser } = useAuth();
  const isOwner = currentUser?._id && reelData?.user && (currentUser._id === (reelData.user._id || reelData.user));
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sentStatus, setSentStatus] = useState({});

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchFriends();
    }
    if (!isOpen) {
      setSelectedAction(null);
    }
  }, [isOpen, currentUser]);

  const fetchFriends = async () => {
    setSentStatus({});
    setLoadingFriends(true);
    try {
      let uniqueFriends = [];
      const seenIds = new Set();

      try {
        const res = await messageService.getConversations();
        if (res.success && res.conversations) {
          res.conversations.forEach(c => {
            if (c.participant && !seenIds.has(c.participant._id)) {
              seenIds.add(c.participant._id);
              uniqueFriends.push({
                _id: c.participant._id,
                username: c.participant.username,
                fullName: c.participant.fullName,
                profilePicture: c.participant.profilePicture
              });
            }
          });
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      }

      if (uniqueFriends.length < 5 && currentUser?._id) {
        try {
          const res = await followService.getMutualFollowers(currentUser._id);
          if (res.success && res.users) {
            res.users.forEach(u => {
              if (!seenIds.has(u._id)) {
                seenIds.add(u._id);
                uniqueFriends.push({
                  _id: u._id,
                  username: u.username,
                  fullName: u.fullName,
                  profilePicture: u.profilePicture
                });
              }
            });
          }
        } catch (err) {
          console.error("Error fetching mutual followers:", err);
        }
      }

      if (uniqueFriends.length < 5) {
        try {
          const res = await userService.getSuggestedUsers(10);
          if (res.success && res.users) {
            res.users.forEach(u => {
              if (u._id !== currentUser?._id && !seenIds.has(u._id)) {
                seenIds.add(u._id);
                uniqueFriends.push({
                  _id: u._id,
                  username: u.username,
                  fullName: u.fullName,
                  profilePicture: u.profilePicture
                });
              }
            });
          }
        } catch (err) {
          console.error("Error fetching suggested users:", err);
        }
      }

      setFriends(uniqueFriends);
    } catch (error) {
      console.error("Error in fetchFriends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSendToFriend = async (friend) => {
    const friendId = friend._id;
    if (sentStatus[friendId] === 'sending' || sentStatus[friendId] === 'sent') return;

    setSentStatus(prev => ({ ...prev, [friendId]: 'sending' }));
    try {
      await onShare?.('chat', friendId);
      setSentStatus(prev => ({ ...prev, [friendId]: 'sent' }));
    } catch (err) {
      console.error("Failed to send reel to friend:", err);
      setSentStatus(prev => ({ ...prev, [friendId]: null }));
    }
  };

  if (!isOpen) return null;

  const handleShareAction = async (platform = 'general') => {
    onShare?.(platform);
    onClose();
  };

  const handleCopyLink = async () => {
    onShare?.('copy');
    onClose();
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!reelData?._id) {
      alert("Video ID not found.");
      return;
    }

    setIsDownloading(true);
    try {
      // Direct native browser download request. Bypasses CORS, JS blocks, and popup blockers completely!
      window.location.href = `${api.defaults.baseURL}/reels/${reelData._id}/download`;
    } catch (err) {
      console.error("Error initiating download:", err);
      alert("Error initiating download. Please try again.");
    } finally {
      // Small timeout to allow the browser to register the download request
      setTimeout(() => {
        setIsDownloading(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-[2000] flex flex-col justify-end share-sheet-backdrop ${
        isDarkMode ? 'bg-black/50' : 'bg-black/30 backdrop-blur-[2px]'
      }`}
      data-modal-open="true"
      onClick={onClose}
    >
      <div 
        className={`w-full rounded-t-[12px] p-4 pb-navbar animate-slide-up ${
          isDarkMode
            ? 'bg-[#161823] text-white'
            : 'bg-white text-black shadow-[0_-12px_36px_rgba(15,23,42,0.16)] border-t border-black/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center mb-4">
           <div className={`w-10 h-1 rounded-full mb-3 shrink-0 ${isDarkMode ? 'bg-white/20' : 'bg-black/15'}`}></div>
           <button
             className={`absolute right-4 transition-opacity hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black/70'}`}
             onClick={onClose}
           >
              <BiX size={24} />
           </button>
        </div>

        <div className="space-y-6">
            <div>
                <h3 className={`text-sm font-bold px-2 mb-4 ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>Send to</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-2 min-h-[92px] items-center">
                    {loadingFriends ? (
                        <div className="flex gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={`skeleton-${i}`} className="flex flex-col items-center w-16 gap-1 animate-pulse">
                                    <div className={`w-12 h-12 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                                    <div className={`w-10 h-2 rounded ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                                    <div className={`w-12 h-4 rounded ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                                </div>
                            ))}
                        </div>
                    ) : !currentUser ? (
                        <p className={`text-xs px-2 font-bold ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>Please login to send to friends</p>
                    ) : friends.length > 0 ? (
                        friends.map(friend => {
                            const status = sentStatus[friend._id];
                            return (
                                <div 
                                  key={friend._id} 
                                  className="flex flex-col items-center shrink-0 w-16 gap-1 group cursor-pointer"
                                  onClick={() => handleSendToFriend(friend)}
                                >
                                   <div className={`w-12 h-12 rounded-full overflow-hidden border group-active:scale-95 transition-transform ${isDarkMode ? 'border-white/5' : 'border-black/10'}`}>
                                       <img 
                                          src={friend.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} 
                                          alt={friend.username} 
                                          className="w-full h-full object-cover bg-gray-100" 
                                       />
                                   </div>
                                   <span className={`text-[10px] font-bold truncate w-full text-center ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>
                                       {friend.username}
                                   </span>
                                   <button 
                                      className={`w-full py-0.5 rounded-[4px] text-[10px] font-black tracking-wide transition-all active:scale-[0.95] ${
                                        status === 'sent'
                                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                                          : status === 'sending'
                                          ? 'bg-gray-500 text-white/70 cursor-not-allowed'
                                          : 'bg-[#FE2C55] text-white shadow-sm shadow-[#FE2C55]/10'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendToFriend(friend);
                                      }}
                                   >
                                      {status === 'sent' ? 'Sent' : status === 'sending' ? '...' : 'Send'}
                                   </button>
                                </div>
                            );
                        })
                    ) : (
                        <p className={`text-xs px-2 font-bold ${isDarkMode ? 'text-white/40' : 'text-black/40'}`}>No friends found</p>
                    )}
                </div>
            </div>

            <div className={`h-px mx-2 ${isDarkMode ? 'bg-white/5' : 'bg-black/[0.08]'}`} />

            <div>
                <h3 className={`text-sm font-bold px-2 mb-4 ${isDarkMode ? 'text-white/50' : 'text-black/45'}`}>Share to</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-2">
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('whatsapp')}>
                       <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                           <FaWhatsapp size={24} color="white" />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>WhatsApp</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('instagram')}>
                       <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center shadow-lg shadow-pink-500/20">
                           <FaInstagram size={24} color="white" />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>Instagram</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('messenger')}>
                       <div className="w-12 h-12 rounded-full bg-[#00B2FF] flex items-center justify-center shadow-lg shadow-[#00B2FF]/20">
                           <FaFacebookMessenger size={24} color="white" />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>Messenger</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={handleCopyLink}>
                       <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                         isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black/75'
                       }`}>
                           <BiLinkAlt size={24} />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>Copy Link</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-16 gap-1 tap-effect cursor-pointer" onClick={() => handleShareAction('general')}>
                       <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                         isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black/75'
                       }`}>
                           <BiShareAlt size={24} />
                       </div>
                       <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/60' : 'text-black/55'}`}>More</span>
                    </div>
                </div>
            </div>

            {(!isOwner || ((reelData?.user?.downloadPrivacy !== 'Off') && (reelData?.allowDownload !== false))) && (
              <div className={`flex gap-4 py-4 px-2 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                  {!isOwner && (
                    <>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedAction === 'report') {
                            setSelectedAction(null);
                          } else {
                            setSelectedAction('report');
                            onReportClick?.();
                          }
                        }}
                        className={`flex-1 flex flex-col items-center gap-2 tap-effect cursor-pointer group ${
                          selectedAction === 'report' ? 'text-tiktok-red' : isDarkMode ? 'text-white' : 'text-black/80'
                        }`}
                      >
                         <BiFlag size={20} className={selectedAction === 'report' ? 'text-tiktok-red' : 'group-hover:text-tiktok-red transition-colors'} />
                         <span className="text-[10px] font-bold">Report</span>
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedAction === 'not_interested') {
                            setSelectedAction(null);
                          } else {
                            setSelectedAction('not_interested');
                            onNotInterestedClick?.();
                          }
                        }}
                        className={`flex-1 flex flex-col items-center gap-2 tap-effect cursor-pointer group ${
                          selectedAction === 'not_interested' ? 'text-tiktok-cyan' : isDarkMode ? 'text-white' : 'text-black/80'
                        }`}
                      >
                         <BiMessageSquareDetail size={20} className={selectedAction === 'not_interested' ? 'text-tiktok-cyan' : 'group-hover:text-tiktok-cyan transition-colors'} />
                         <span className="text-[10px] font-bold">Not interested</span>
                      </div>
                    </>
                  )}
                  {((reelData?.user?.downloadPrivacy !== 'Off') && (reelData?.allowDownload !== false)) && (
                    <div 
                      onClick={handleDownload}
                      className={`flex-1 flex flex-col items-center gap-2 tap-effect cursor-pointer group ${isDarkMode ? 'text-white' : 'text-black/80'} ${isDownloading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isDownloading ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <BiDownload size={20} className="group-hover:text-success transition-colors" />
                      )}
                      <span className="text-[10px] font-bold">{isDownloading ? "Saving..." : "Save video"}</span>
                    </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ShareSheet;
