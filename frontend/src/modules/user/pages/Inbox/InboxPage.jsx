import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import messageService from '../../../../services/messageService';
import userService from '../../../../services/userService';
import notificationService from '../../../../services/notificationService';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import ActiveStatusSheet from '../../components/modals/ActiveStatusSheet';

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const ConversationItem = ({ conv, currentUser, navigate, onAction, isOnline }) => {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = true;
    longPressTriggered.current = false;
    
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onAction(conv, e.touches[0].clientX, e.touches[0].clientY);
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!isSwiping.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    if (diff < 0) {
      setSwipeX(Math.max(diff, -70));
    } else {
      setSwipeX(0);
    }
  };

  const handleTouchEnd = (e) => {
    if (longPressTriggered.current) {
      e.preventDefault();
    }
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    isSwiping.current = false;
    setSwipeX(0);
  };

  const isUnread = conv.unreadCount > 0;

  return (
    <div
      className="relative flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-all duration-200"
      onClick={() => conv.participant && navigate(`/inbox/chat/${conv.participant.username}`)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        onAction(conv, e.clientX, e.clientY);
      }}
    >
      <div className="relative shrink-0">
        <div className={`w-[60px] h-[60px] rounded-full overflow-hidden p-[2px] ${isUnread ? 'bg-gradient-to-tr from-[#FE2C55] to-[#ff8e3c]' : 'bg-black/10 dark:bg-white/10'}`}>
          <div className="w-full h-full rounded-full bg-white dark:bg-[#161616] p-[2px]">
            <img
              src={conv.participant?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participant?.username}`}
              alt=""
              className="w-full h-full rounded-full object-cover bg-gray-200 dark:bg-[#242424]"
            />
          </div>
        </div>
        <span
          className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#161616] transition-colors duration-300 z-10 ${
            isOnline
              ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]'
              : 'bg-gray-400 dark:bg-gray-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
        {conv.unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 bg-[#FE2C55] rounded-full border-2 border-white dark:border-[#161616] flex items-center justify-center text-[10px] font-black text-white shadow-sm z-10">
            {conv.unreadCount}
          </div>
        )}
        {conv.isPinned && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-[#242424] rounded-full shadow-md flex items-center justify-center text-black/40 dark:text-white/40 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/>
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-[15px] truncate ${isUnread ? 'font-black theme-text-primary' : 'font-bold theme-text-primary'}`}>
              {conv.participant?.fullName || conv.participant?.username || 'User'}
            </p>
            {conv.isMuted && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#9ca3af" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 2.77-1.39 5.22-3.5 6.69l1.45 1.45C19.78 18.25 21.5 15.33 21.5 12s-1.72-6.25-4.55-8.14l-1.45 1.45C17.61 6.78 19 9.23 19 12zM3 9v6h4l5 5V4L7 9H3z"/>
              </svg>
            )}
          </div>
          <p className="text-[11px] font-bold theme-text-secondary uppercase tracking-tight shrink-0">
            {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[13px] truncate ${isUnread ? 'theme-text-primary font-bold' : 'theme-text-secondary'}`}>
            {conv.lastMessage?.messageType === 'text' ? conv.lastMessage.text :
              conv.lastMessage?.messageType === 'image' ? 'Sent an image 📷' :
                conv.lastMessage?.messageType === 'video' ? 'Sent a video 🎥' :
                  conv.lastMessage?.messageType === 'reel' ? 'Shared a reel 🎬' : 'Start chatting'}
          </p>
          {isUnread && <div className="w-2 h-2 rounded-full bg-[#FE2C55] shrink-0"></div>}
        </div>
      </div>
    </div>
  );
};

const InboxPage = () => {
  const navigate = useNavigate();
  const { config } = useAppContent();
  const { user: currentUser } = useAuth();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuConfig, setMenuConfig] = useState(null); // { conv, x, y }
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isActiveStatusSheetOpen, setIsActiveStatusSheetOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  const fetchCounts = async () => {
    try {
      const unreadRes = await notificationService.getUnreadCount();
      if (unreadRes.success) {
        setUnreadNotificationsCount(unreadRes.count);
      }
    } catch (err) {
      console.error('Failed to fetch inbox counts:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    if (currentUser) {
      fetchCounts();
    }
  }, [currentUser]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', () => fetchConversations());
      socket.on('conversation_read', () => fetchConversations());
      socket.on('user_online', ({ userId }) => {
        if (userId) setOnlineUserIds(prev => new Set(prev).add(userId));
      });
      socket.on('user_offline', ({ userId }) => {
        if (userId) setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      });
      return () => {
        socket.off('new_message');
        socket.off('conversation_read');
        socket.off('user_online');
        socket.off('user_offline');
      };
    }
  }, [socket]);

  const getIsOnline = (conv) => {
    if (!conv?.participant) return false;
    if (onlineUserIds.has(conv.participant._id)) return true;
    return !!conv.participant.isOnline;
  };

  const fetchConversations = async () => {
    try {
      const res = await messageService.getConversations();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (conv, x, y) => {
    setMenuConfig({ conv, x, y });
  };

  const handleMuteToggle = async () => {
    if (!menuConfig?.conv) return;
    try {
      const res = await messageService.toggleMuteConversation(menuConfig.conv._id);
      if (res.success) {
        setConversations(prev => prev.map(c => 
          c._id === menuConfig.conv._id ? { ...c, isMuted: res.isMuted } : c
        ));
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    } finally {
      setMenuConfig(null);
    }
  };

  const handlePinToggle = async () => {
    if (!menuConfig?.conv) return;
    try {
      const res = await messageService.togglePinConversation(menuConfig.conv._id);
      if (res.success) {
        setConversations(prev => {
          const updated = prev.map(c => 
            c._id === menuConfig.conv._id ? { ...c, isPinned: res.isPinned } : c
          );
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
          });
        });
      }
    } catch (err) { console.error(err); }
    setMenuConfig(null);
  };

  const handleDeleteConversation = async () => {
    if (!menuConfig?.conv) return;
    if (window.confirm('Delete this conversation? This will hide it for you.')) {
      try {
        const res = await messageService.deleteConversation(menuConfig.conv._id);
        if (res.success) {
          setConversations(prev => prev.filter(c => c._id !== menuConfig.conv._id));
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      } finally {
        setMenuConfig(null);
      }
    }
  };

  return (
    <div className="page-container theme-surface-page flex flex-col h-full relative select-none">
      {/* Context Menu Modal */}
      {menuConfig && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
          onClick={() => setMenuConfig(null)}
        >
          <div 
            className="w-64 bg-white dark:bg-[#242424] border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1">
              <p className="text-[13px] font-bold truncate theme-text-primary">
                {menuConfig.conv.participant?.fullName || menuConfig.conv.participant?.username}
              </p>
            </div>
            
            <button 
              onClick={handlePinToggle}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-[14px] font-medium flex items-center gap-3 transition-colors theme-text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/></svg>
              {menuConfig.conv.isPinned ? 'Unpin Chat' : 'Pin Chat'}
            </button>

            <button 
              onClick={handleMuteToggle}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-[14px] font-medium flex items-center gap-3 transition-colors theme-text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              {menuConfig.conv.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
            </button>

            <button 
              onClick={handleDeleteConversation}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-500/10 active:bg-red-500/20 text-red-500 text-[14px] font-semibold flex items-center gap-3 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete Chat
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0 theme-panel-card backdrop-blur-md sticky top-0 z-[60] border-b theme-panel-divider">
        <div className="w-10" />

        <div className="flex items-center gap-1.5">
          <h2 className="text-[18px] font-black tracking-tight theme-text-primary">Inbox</h2>
          <button
            onClick={() => setIsActiveStatusSheetOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-gray-200/60 dark:bg-white/10 hover:bg-gray-300/60 dark:hover:bg-white/15 rounded-md transition-all cursor-pointer active:scale-95"
            title="Active Status Settings"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                currentUser?.activeStatusPrivacy !== 'no_one'
                  ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]'
                  : 'bg-gray-400'
              }`}
            />
            <svg className="w-3 h-3 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
        </div>

        <button 
          onClick={() => navigate('/inbox/search')}
          className="w-10 h-10 flex items-center justify-end cursor-pointer theme-text-primary active:scale-95 transition-transform"
          title="Search accounts and messages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      <div className="scrollable flex-1 pt-2 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 theme-text-primary">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FE2C55] mb-4"></div>
             <p className="text-[14px] font-bold">Loading your chats...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 px-4 mb-4">
              {/* System Activities Entry */}
              <div 
                onClick={() => navigate('/inbox/activity')}
                className="flex items-center gap-4 p-4 bg-white/50 dark:bg-[#242424] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 rounded-2xl border border-black/5 dark:border-white/5 cursor-pointer transition-all duration-200"
              >
                <div className="relative shrink-0 w-11 h-11 rounded-full bg-[#FE2C55]/10 border border-[#FE2C55]/20 flex items-center justify-center text-[#FE2C55]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadNotificationsCount > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FE2C55] rounded-full border-2 border-white dark:border-[#161616] flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                      {unreadNotificationsCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold theme-text-primary leading-normal">System Activities</p>
                  <p className="text-[12px] theme-text-secondary truncate">Likes, comments, mentions and more</p>
                </div>
                <div className="shrink-0 theme-text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </div>

            {conversations.length > 0 ? (
              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
                {conversations.map((conv) => (
                  <ConversationItem 
                    key={conv._id} 
                    conv={conv} 
                    currentUser={currentUser} 
                    navigate={navigate} 
                    onAction={handleAction}
                    isOnline={getIsOnline(conv)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-10 theme-text-secondary">
                <div className="w-20 h-20 bg-black/5 dark:bg-[#242424] rounded-full flex items-center justify-center mb-4 text-black/20 dark:text-white/20">
                   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                     <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                   </svg>
                </div>
                <p className="text-[16px] font-bold theme-text-primary">No chats yet</p>
                <p className="text-[13px] mt-1">Start a conversation with someone you follow!</p>
              </div>
            )}
          </>
        )}
      </div>

      <ActiveStatusSheet
        isOpen={isActiveStatusSheetOpen}
        onClose={() => setIsActiveStatusSheetOpen(false)}
      />
    </div>
  );
};

export default InboxPage;
