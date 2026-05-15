import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import followService from '../../../../services/followService';
import messageService from '../../../../services/messageService';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';

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

const ConversationItem = ({ conv, currentUser, navigate, onAction }) => {
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
      className="relative flex items-center gap-4 px-4 py-3 cursor-pointer active:bg-gray-50 transition-all duration-200"
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
        <div className={`w-[60px] h-[60px] rounded-full overflow-hidden p-[2px] ${isUnread ? 'bg-gradient-to-tr from-[#FE2C55] to-[#ff8e3c]' : 'bg-gray-100'}`}>
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            <img
              src={conv.participant?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participant?.username}`}
              alt=""
              className="w-full h-full rounded-full object-cover bg-gray-50"
            />
          </div>
        </div>
        {conv.unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 bg-[#FE2C55] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
            {conv.unreadCount}
          </div>
        )}
        {conv.isPinned && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/>
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <p className={`text-[15px] truncate ${isUnread ? 'font-black text-black' : 'font-bold text-gray-800'}`}>
              {conv.participant?.fullName || conv.participant?.username || 'User'}
            </p>
            {conv.participant?.isVerified && (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#20D5EC" viewBox="0 0 24 24">
                <path d="M23.33 11.51l-2.07-2.39.29-3.15-3.1-.71-1.62-2.73-2.83 1.22-2.83-1.22-1.62 2.73-3.1.71.29 3.15-2.07 2.39 2.07 2.39-.29 3.15 3.1.71 1.62 2.73 2.83-1.22 2.83 1.22 1.62-2.73 3.1-.71-.29-3.15 2.07-2.39zM10.23 16.5l-3.37-3.37 1.41-1.41 1.96 1.96 4.67-4.67 1.41 1.41-6.08 6.08z"/>
              </svg>
            )}
            {conv.isMuted && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#9ca3af" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 2.77-1.39 5.22-3.5 6.69l1.45 1.45C19.78 18.25 21.5 15.33 21.5 12s-1.72-6.25-4.55-8.14l-1.45 1.45C17.61 6.78 19 9.23 19 12zM3 9v6h4l5 5V4L7 9H3z"/>
              </svg>
            )}
          </div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight shrink-0">
            {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[13px] truncate ${isUnread ? 'text-black font-bold' : 'text-gray-500'}`}>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuConfig, setMenuConfig] = useState(null); // { conv, x, y }

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.participant?.username?.toLowerCase().includes(query) ||
      conv.participant?.fullName?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', () => fetchConversations());
      socket.on('conversation_read', () => fetchConversations());
      return () => {
        socket.off('new_message');
        socket.off('conversation_read');
      };
    }
  }, [socket]);

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

  const handlePin = async (conv) => {
    try {
      const res = await messageService.togglePinConversation(conv._id);
      if (res.success) {
        setConversations(prev => {
          const updated = prev.map(c => 
            c._id === conv._id ? { ...c, isPinned: res.isPinned } : c
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

  const handleMute = async (conv) => {
    try {
      const res = await messageService.toggleMuteConversation(conv._id);
      if (res.success) {
        setConversations(prev => prev.map(c => 
          c._id === conv._id ? { ...c, isMuted: res.isMuted } : c
        ));
      }
    } catch (err) { console.error(err); }
    setMenuConfig(null);
  };

  const handleDelete = async (conv) => {
    if (!window.confirm('Delete this conversation? This will hide it for you.')) return;
    try {
      const res = await messageService.deleteConversation(conv._id);
      if (res.success) {
        setConversations(prev => prev.filter(c => c._id !== conv._id));
      }
    } catch (err) { console.error(err); }
    setMenuConfig(null);
  };

  return (
    <div className="page-container bg-white flex flex-col overflow-hidden text-black h-screen relative">
      {/* Action Menu Overlay */}
      {menuConfig && (
        <div 
          className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-[2px] transition-all duration-300" 
          onClick={() => setMenuConfig(null)}
          onContextMenu={(e) => { e.preventDefault(); setMenuConfig(null); }}
        >
          <div 
            className="absolute bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/20 py-1.5 min-w-[200px] animate-scale-in"
            style={{ 
              top: Math.min(menuConfig.y, window.innerHeight - 200), 
              left: Math.min(menuConfig.x, window.innerWidth - 220) 
            }}
          >
            <button 
              className="w-full px-4 py-3.5 text-left text-[14px] font-bold active:bg-gray-100 flex items-center justify-between gap-3 border-b border-gray-50 transition-colors"
              onClick={() => handlePin(menuConfig.conv)}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/></svg>
                {menuConfig.conv.isPinned ? 'Unpin Chat' : 'Pin Chat'}
              </div>
            </button>
            <button 
              className="w-full px-4 py-3.5 text-left text-[14px] font-bold active:bg-gray-100 flex items-center justify-between gap-3 border-b border-gray-50 transition-colors"
              onClick={() => handleMute(menuConfig.conv)}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                {menuConfig.conv.isMuted ? 'Unmute' : 'Mute Notifications'}
              </div>
            </button>
            <button 
              className="w-full px-4 py-3.5 text-left text-[14px] font-bold text-[#FE2C55] active:bg-red-50 flex items-center gap-3 transition-colors"
              onClick={() => handleDelete(menuConfig.conv)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete Chat
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-[60]">
        <div className="w-10" />
        <h2 className="text-[18px] font-black tracking-tight text-black">Inbox</h2>
        <div className="w-10" />
      </div>

      <div className="px-4 mb-4 shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FE2C55] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages"
            className="w-full bg-gray-100/80 border border-transparent focus:border-gray-100 focus:bg-white rounded-2xl py-3 pl-10 pr-4 text-[15px] outline-none transition-all placeholder:text-gray-400 font-medium shadow-sm"
          />
        </div>
      </div>

      <div className="scrollable flex-1 pt-2 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FE2C55] mb-4"></div>
             <p className="text-[14px] font-bold">Loading your chats...</p>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="flex flex-col divide-y divide-gray-50/50">
            {filteredConversations.map((conv) => (
              <ConversationItem 
                key={conv._id} 
                conv={conv} 
                currentUser={currentUser} 
                navigate={navigate} 
                onAction={handleAction}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-10">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                 <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
               </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900">No chats yet</p>
            <p className="text-[13px] text-gray-400 mt-1">Start a conversation with someone you follow!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
