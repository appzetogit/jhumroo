import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useSocket } from '../../../../context/SocketContext';
import { useAuth } from '../../../../context/AuthContext';
import messageService from '../../../../services/messageService';
import userService from '../../../../services/userService';
import ReportUserSheet from '../../components/modals/ReportUserSheet';

const formatBubbleTimestamp = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const THEMES = {
  default: {
    name: 'Default',
    bgClass: 'theme-surface-page',
    textClass: 'text-white',
    headerBg: 'bg-[#161616] border-b border-white/5',
    headerText: 'text-white',
    bubbleMe: 'bg-[#FE2C55] text-white',
    bubbleOther: 'bg-[#242424] text-white border border-white/5',
    bubbleTimestamp: 'text-white/40',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#161616] border-t border-white/5',
    inputBg: 'bg-[#242424] text-white border border-white/5',
  },
  midnight: {
    name: 'Midnight Neon',
    bgClass: 'bg-gradient-to-b from-[#090A0F] via-[#0E1017] to-[#12141F] relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_45%)] before:pointer-events-none',
    textClass: 'text-white',
    headerBg: 'bg-[#0E1017]/85 backdrop-blur-md border-white/5',
    headerText: 'text-white',
    bubbleMe: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 border border-violet-400/20',
    bubbleOther: 'bg-white/10 text-white border border-white/5 backdrop-blur-sm',
    bubbleTimestamp: 'text-gray-500',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#0E1017]/95 border-white/5',
    inputBg: 'bg-white/5 text-white',
  },
  sunset: {
    name: 'Sunset Glow',
    bgClass: 'bg-gradient-to-tr from-[#FFF5F5] via-[#FFF0EA] to-[#F0F4FF]',
    textClass: 'text-gray-900',
    headerBg: 'bg-white/80 backdrop-blur-md border-orange-100',
    headerText: 'text-gray-900',
    bubbleMe: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/15',
    bubbleOther: 'bg-white/70 text-gray-800 border border-orange-100/50 backdrop-blur-sm',
    bubbleTimestamp: 'text-orange-400/80',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-orange-100',
    inputBg: 'bg-orange-50/50 text-gray-900',
  },
  ocean: {
    name: 'Tranquil Ocean',
    bgClass: 'bg-gradient-to-br from-[#E0F2FE] via-[#F0FDF4] to-[#E0F2FE]',
    textClass: 'text-sky-950',
    headerBg: 'bg-white/80 backdrop-blur-md border-sky-100',
    headerText: 'text-sky-950',
    bubbleMe: 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/15',
    bubbleOther: 'bg-white/85 text-sky-900 border border-sky-100/60 backdrop-blur-sm',
    bubbleTimestamp: 'text-sky-400',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-sky-100',
    inputBg: 'bg-sky-50/50 text-sky-950',
  },
  lavender: {
    name: 'Lavender Dream',
    bgClass: 'bg-gradient-to-tr from-[#FAF5FF] via-[#EEF2FF] to-[#FAF5FF]',
    textClass: 'text-purple-950',
    headerBg: 'bg-white/80 backdrop-blur-md border-purple-100',
    headerText: 'text-purple-950',
    bubbleMe: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/15',
    bubbleOther: 'bg-white/85 text-purple-900 border border-purple-100/60 backdrop-blur-sm',
    bubbleTimestamp: 'text-purple-400',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-purple-100',
    inputBg: 'bg-purple-50/50 text-purple-950',
  },
  cherry: {
    name: 'Cherry Blossom',
    bgClass: 'bg-gradient-to-tr from-[#FFF5F7] via-[#FFF5F5] to-[#FFF0F2]',
    textClass: 'text-rose-950',
    headerBg: 'bg-white/80 backdrop-blur-md border-rose-100',
    headerText: 'text-rose-950',
    bubbleMe: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/15',
    bubbleOther: 'bg-white/85 text-rose-900 border border-rose-100/60 backdrop-blur-sm',
    bubbleTimestamp: 'text-rose-400',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-rose-100',
    inputBg: 'bg-rose-50/50 text-rose-950',
  },
  emerald: {
    name: 'Emerald Forest',
    bgClass: 'bg-gradient-to-tr from-[#022C22] via-[#064E3B] to-[#022C22] relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_45%)] before:pointer-events-none',
    textClass: 'text-white',
    headerBg: 'bg-[#064E3B]/85 backdrop-blur-md border-emerald-950/20',
    headerText: 'text-white',
    bubbleMe: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20',
    bubbleOther: 'bg-white/10 text-white border border-white/5 backdrop-blur-sm',
    bubbleTimestamp: 'text-emerald-400/70',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#064E3B]/95 border-emerald-950/20',
    inputBg: 'bg-white/5 text-white',
  },
  aurora: {
    name: 'Northern Lights',
    bgClass: 'bg-gradient-to-b from-[#0F172A] via-[#042F2E] to-[#1E1B4B] relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.15),transparent_50%)] before:pointer-events-none',
    textClass: 'text-white',
    headerBg: 'bg-[#042F2E]/80 backdrop-blur-md border-white/5',
    headerText: 'text-white',
    bubbleMe: 'bg-gradient-to-r from-teal-400 to-indigo-500 text-white shadow-lg shadow-teal-500/20',
    bubbleOther: 'bg-white/10 text-white border border-white/5 backdrop-blur-sm',
    bubbleTimestamp: 'text-teal-300/70',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#042F2E]/95 border-white/5',
    inputBg: 'bg-white/5 text-white',
  },
  charcoal: {
    name: 'Charcoal Matte',
    bgClass: 'bg-gradient-to-b from-[#18181B] via-[#09090B] to-[#18181B]',
    textClass: 'text-zinc-100',
    headerBg: 'bg-[#09090B]/90 backdrop-blur-md border-zinc-800/50',
    headerText: 'text-zinc-100',
    bubbleMe: 'bg-gradient-to-r from-zinc-700 to-zinc-600 text-white shadow-md border border-zinc-600/30',
    bubbleOther: 'bg-zinc-800 text-zinc-200 border border-zinc-700/50',
    bubbleTimestamp: 'text-zinc-500',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#09090B]/95 border-zinc-800/50',
    inputBg: 'bg-zinc-900 text-zinc-100',
  },
  grape: {
    name: 'Grape Soda',
    bgClass: 'bg-gradient-to-tr from-[#2E1065] via-[#4C1D95] to-[#2E1065]',
    textClass: 'text-white',
    headerBg: 'bg-[#4C1D95]/85 backdrop-blur-md border-purple-950/20',
    headerText: 'text-white',
    bubbleMe: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 border border-purple-400/20',
    bubbleOther: 'bg-white/10 text-white border border-white/5 backdrop-blur-sm',
    bubbleTimestamp: 'text-purple-300/70',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#4C1D95]/95 border-purple-950/20',
    inputBg: 'bg-white/5 text-white',
  },
  gold: {
    name: 'Golden Hour',
    bgClass: 'bg-gradient-to-br from-[#FEF3C7] via-[#FFFBEB] to-[#FEF3C7]',
    textClass: 'text-amber-950',
    headerBg: 'bg-white/80 backdrop-blur-md border-amber-100',
    headerText: 'text-amber-950',
    bubbleMe: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/15',
    bubbleOther: 'bg-white/85 text-amber-900 border border-amber-100/60 backdrop-blur-sm',
    bubbleTimestamp: 'text-amber-500',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-amber-100',
    inputBg: 'bg-amber-50/50 text-amber-950',
  },
  rose: {
    name: 'Rose Quartz',
    bgClass: 'bg-gradient-to-tr from-[#FFF1F2] via-[#FFF5F5] to-[#FFE4E6]',
    textClass: 'text-rose-950',
    headerBg: 'bg-white/80 backdrop-blur-md border-rose-100',
    headerText: 'text-rose-950',
    bubbleMe: 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-400/15',
    bubbleOther: 'bg-white/85 text-rose-900 border border-rose-100/60 backdrop-blur-sm',
    bubbleTimestamp: 'text-rose-400',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-rose-100',
    inputBg: 'bg-rose-50/50 text-rose-950',
  },
  nebula: {
    name: 'Deep Space',
    bgClass: 'bg-gradient-to-b from-[#020617] via-[#1E1B4B] to-[#0F172A] relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(219,39,119,0.1),transparent_45%)] before:pointer-events-none',
    textClass: 'text-white',
    headerBg: 'bg-[#1E1B4B]/80 backdrop-blur-md border-white/5',
    headerText: 'text-white',
    bubbleMe: 'bg-gradient-to-r from-pink-500 to-indigo-500 text-white shadow-lg shadow-pink-500/20 border border-pink-400/10',
    bubbleOther: 'bg-white/10 text-white border border-white/5 backdrop-blur-sm',
    bubbleTimestamp: 'text-indigo-300/70',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#1E1B4B]/95 border-white/5',
    inputBg: 'bg-white/5 text-white',
  },
  coral: {
    name: 'Coral Reef',
    bgClass: 'bg-gradient-to-tr from-[#FFF5F5] via-[#FFF5EC] to-[#FFE4E6]',
    textClass: 'text-orange-950',
    headerBg: 'bg-white/80 backdrop-blur-md border-orange-100',
    headerText: 'text-orange-950',
    bubbleMe: 'bg-gradient-to-r from-orange-400 via-rose-400 to-pink-500 text-white shadow-lg shadow-orange-500/15',
    bubbleOther: 'bg-white/85 text-orange-900 border border-orange-100/60 backdrop-blur-sm',
    bubbleTimestamp: 'text-orange-400/80',
    scrollbarClass: '',
    inputAreaBg: 'bg-white/90 backdrop-blur-md border-orange-100',
    inputBg: 'bg-orange-50/50 text-orange-950',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    bgClass: 'bg-gradient-to-b from-[#030712] via-[#111827] to-[#030712] relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.08),transparent_45%)] before:pointer-events-none',
    textClass: 'text-yellow-400',
    headerBg: 'bg-[#111827]/90 backdrop-blur-md border-yellow-500/10',
    headerText: 'text-yellow-400',
    bubbleMe: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold shadow-lg shadow-yellow-500/20 border border-yellow-300/20',
    bubbleOther: 'bg-zinc-900 text-cyan-400 border border-cyan-500/25 backdrop-blur-sm',
    bubbleTimestamp: 'text-cyan-500/60',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#111827]/95 border-yellow-500/10',
    inputBg: 'bg-zinc-950 text-yellow-400 border border-yellow-500/10',
  },
  espresso: {
    name: 'Espresso House',
    bgClass: 'bg-gradient-to-tr from-[#1E1B18] via-[#2D2A26] to-[#1E1B18]',
    textClass: 'text-[#F5EBE6]',
    headerBg: 'bg-[#2D2A26]/90 backdrop-blur-md border-[#3E3A35]',
    headerText: 'text-[#F5EBE6]',
    bubbleMe: 'bg-gradient-to-r from-[#D5C2B4] to-[#BFA899] text-stone-900 font-semibold shadow-md',
    bubbleOther: 'bg-[#3E3A35] text-[#F5EBE6] border border-[#4E4A45]',
    bubbleTimestamp: 'text-stone-400',
    scrollbarClass: 'dark-scrollbar',
    inputAreaBg: 'bg-[#2D2A26]/95 border-[#3E3A35]',
    inputBg: 'bg-[#1E1B18] text-[#F5EBE6]',
  }
};

const MessageBubble = ({ message, isMe, isLastInGroup, targetUser, username, onReply, onAction, theme = THEMES.default }) => {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);
  const pressTimer = useRef(null);

  const longPressTriggered = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = true;
    longPressTriggered.current = false;
    
    // Long press detection
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onAction(message, e.touches[0].clientX, e.touches[0].clientY);
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
    
    // Swipe left (negative diff) to reply
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
    if (swipeX <= -50) {
      onReply(message);
    }
    setSwipeX(0);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    onAction(message, e.clientX, e.clientY);
  };

  return (
    <div 
      className={`relative w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-transform duration-200 ease-out cursor-pointer select-none overflow-x-hidden`}
      style={{ 
        transform: `translateX(${swipeX}px)`,
        touchAction: 'pan-y'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && isLastInGroup && (
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-100 mb-1">
            <img
              src={targetUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              alt={username}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!isMe && !isLastInGroup && <div className="w-7 shrink-0" />}

        <div className="flex flex-col gap-1">
          {message.isPinned && (
            <div className={`flex items-center gap-1 mb-0.5 opacity-40 ${isMe ? 'justify-end' : 'justify-start'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/></svg>
              <span className="text-[9px] font-bold uppercase">Pinned</span>
            </div>
          )}
          {message.replyTo && (
            <div className={`text-[12px] px-3 py-1.5 rounded-[12px] opacity-60 border-l-2 max-w-fit ${
              theme === THEMES.midnight ? 'bg-white/5 border-violet-500 text-white/90' : 'bg-[#242424] border-white/10 text-white'
            } ${isMe ? 'self-end border-[#FE2C55]' : 'self-start'}`}>
               <p className="font-bold text-[10px] truncate">
                  {message.replyTo.sender?.username || 'user'}
               </p>
               <p className="truncate max-w-[150px]">
                  {message.replyTo.content?.text || message.replyTo.text}
               </p>
            </div>
          )}
            {message.messageType === 'image' ? (
              <div className={`rounded-[18px] overflow-hidden border shadow-sm ${isMe ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'} ${
                theme === THEMES.midnight ? 'border-white/10' : 'border-gray-100'
              }`}>
                 <img 
                    src={message.content?.mediaUrl || message.mediaUrl} 
                    alt="shared" 
                    className="max-w-[220px] max-h-[320px] object-cover" 
                 />
              </div>
            ) : (
              <div
                className={`px-4 py-2.5 text-[14.5px] leading-[1.4] shadow-sm transition-all ${
                  isMe
                    ? `${theme.bubbleMe} rounded-[18px] rounded-br-[4px]`
                    : `${theme.bubbleOther} rounded-[18px] rounded-bl-[4px]`
                }`}
              >
                {message.content?.text || message.text}
              </div>
            )}
        </div>
      </div>
      
      <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'pr-1' : 'pl-9'}`}>
        <p className={`text-[10px] font-medium uppercase tracking-tighter transition-colors ${theme.bubbleTimestamp}`}>
          {formatBubbleTimestamp(message.createdAt)}
        </p>
        {isMe && isLastInGroup && (
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={message.isRead ? '#00B2FF' : '#D1D5DB'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
              {message.isRead && <path d="M20 12l-11 11-5-5" className="opacity-70" />}
            </svg>
          </div>
        )}
      </div>
      
      {/* Swipe Indicator (Visible only when swiping) */}
      <div 
        className="absolute -right-10 top-1/2 -translate-y-1/2 transition-opacity"
        style={{ opacity: Math.abs(swipeX) / 70 }}
      >
         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#FE2C55" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/>
         </svg>
      </div>
    </div>
  );
};

const PinnedMessageBar = ({ message, onUnpin, onClick, theme = THEMES.default }) => {
  if (!message) return null;

  return (
    <div 
      className={`px-4 py-2.5 backdrop-blur-md border-b flex items-center gap-3 cursor-pointer transition-all animate-slide-down sticky top-0 z-[40] ${
        theme === THEMES.midnight 
          ? 'bg-black/40 border-white/5 hover:bg-black/60 active:bg-black/75 text-white' 
          : 'bg-[#242424]/85 border-white/5 hover:bg-[#242424] active:bg-[#161616] text-white'
      }`}
      onClick={() => onClick(message)}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
        theme === THEMES.midnight ? 'bg-white/10' : 'bg-white/10'
      }`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={theme === THEMES.midnight ? '#bbb' : '#aaa'} viewBox="0 0 24 24">
          <path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold truncate leading-tight">
          {message.content?.text || message.text}
        </p>
        <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
          theme === THEMES.midnight ? 'text-violet-400' : 'text-white/40'
        }`}>Pinned Message</p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onUnpin(message); }}
        className={`p-1.5 transition-colors ${
          theme === THEMES.midnight ? 'text-white/40 hover:text-red-400' : 'text-white/40 hover:text-[#FE2C55]'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
};

const ChatPage = () => {
  const navigate = useNavigate();
  const { username = '' } = useParams();
  const { config } = useAppContent();
  const socket = useSocket();
  const { user: currentUser, updateUser } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [menuConfig, setMenuConfig] = useState(null); // { message, x, y }
  const [privacyError, setPrivacyError] = useState(null);

  // Premium Features States
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThemeKey, setActiveThemeKey] = useState('default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showBlockConfirmation, setShowBlockConfirmation] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  const theme = THEMES[activeThemeKey] || THEMES.default;

  const displayName = isBlockedByThem ? 'Jhumroo User' : (targetUser?.fullName || username);
  const displayUsername = isBlockedByThem ? 'jhumroo_user' : username;
  const displayAvatar = isBlockedByThem 
    ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=jhumroo_user' 
    : (targetUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`);

  // Initialize theme and block status when targetUser loads
  useEffect(() => {
    if (targetUser?._id) {
      const storedTheme = localStorage.getItem(`jhumroo_chat_theme_${targetUser._id}`);
      if (storedTheme && THEMES[storedTheme]) {
        setActiveThemeKey(storedTheme);
      }
      if (currentUser?.blockedUsers) {
        setIsBlocked(currentUser.blockedUsers.includes(targetUser._id));
      }
    }
  }, [targetUser?._id, currentUser?.blockedUsers]);

  // Real-time message filtering for search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages.filter(m => {
      const text = (m.content?.text || m.text || '').toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    });
  }, [messages, searchQuery]);

  // Toggle user block status
  const handleBlockToggle = async () => {
    if (!targetUser) return;
    try {
      const res = await userService.blockUser(targetUser._id);
      if (res.success) {
        setIsBlocked(res.isBlocked);
        
        // Synchronize context blockedUsers
        if (currentUser && updateUser) {
          const updatedBlockedUsers = res.isBlocked
            ? [...(currentUser.blockedUsers || []), targetUser._id]
            : (currentUser.blockedUsers || []).filter(id => id !== targetUser._id);
          
          updateUser({
            ...currentUser,
            blockedUsers: updatedBlockedUsers
          });
        }
        setShowBlockConfirmation(false);
      }
    } catch (error) {
      console.error('Failed to toggle block status:', error);
    }
  };
  
  const isMeTypingRef = useRef(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});

  const pinnedMessage = useMemo(() => {
    // Find the most recent pinned message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isPinned) return messages[i];
    }
    return null;
  }, [messages]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/inbox');
  };

  useEffect(() => {
    fetchChatData();
  }, [username]);

  useEffect(() => {
    if (socket && conversation?._id) {
      socket.emit('join_conversation', conversation._id);

      socket.on('new_message', (data) => {
        if (data.conversationId === conversation._id) {
          setMessages(prev => {
            if (prev.find(m => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });
          messageService.markAsRead(conversation._id).catch(console.error);
        }
      });

      socket.on('user_typing', (data) => {
        if (data.conversationId === conversation._id && data.userId !== currentUser._id) {
          setIsTyping(data.isTyping);
        }
      });

      socket.on('conversation_read', (data) => {
        if (data.conversationId === conversation._id && data.readBy !== currentUser._id) {
          setMessages(prev => prev.map(msg => ({
            ...msg,
            isRead: true,
            readAt: msg.readAt || new Date().toISOString()
          })));
        }
      });

      socket.on('message_pinned', (data) => {
        if (data.conversationId === conversation._id) {
          setMessages(prev => prev.map(msg => 
            msg._id === data.messageId ? { ...msg, isPinned: data.isPinned } : msg
          ));
        }
      });

      return () => {
        socket.emit('leave_conversation', conversation._id);
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('conversation_read');
        socket.off('message_pinned');
      };
    }
  }, [socket, conversation?._id, currentUser?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  const fetchChatData = async () => {
    setLoading(true);
    try {
      const userRes = await userService.getUserByUsername(username);
      if (userRes.success) {
        setTargetUser(userRes.user);
        setIsBlockedByThem(userRes.user.isBlockedByThem || false);
        const convRes = await messageService.getConversation(userRes.user._id);
        if (convRes.success) {
          setConversation(convRes.conversation);
          const msgRes = await messageService.getMessages(convRes.conversation._id);
          if (msgRes.success) {
            setMessages(msgRes.messages);
            messageService.markAsRead(convRes.conversation._id).catch(console.error);
          }
        }
      }
    } catch (error) {
      if (error.message && (error.message.includes('not allowed') || error.message.includes('mutual followers'))) {
        setPrivacyError(error.message);
      } else {
        console.error('Failed to fetch chat data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !targetUser) return;
    const messageText = draft.trim();
    setDraft('');
    if (isMeTypingRef.current) {
        isMeTypingRef.current = false;
        handleTyping(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const res = await messageService.sendMessage({
        receiverId: targetUser._id,
        messageType: 'text',
        text: messageText,
        conversationId: conversation?._id,
        replyTo: replyingTo?._id
      });
      if (res.success) {
        setMessages(prev => [...prev, res.message]);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAction = (message, x, y) => {
    setMenuConfig({ message, x, y });
  };

  const handleCopy = async (message) => {
    const text = message.content?.text || message.text;
    if (text) {
      await navigator.clipboard.writeText(text);
    }
    setMenuConfig(null);
  };

  const handlePin = async (message) => {
    try {
      const res = message.isPinned 
        ? await messageService.unpinMessage(message._id)
        : await messageService.pinMessage(message._id);
      
      if (res.success) {
        setMessages(prev => prev.map(m => 
          m._id === message._id ? { ...m, isPinned: !message.isPinned } : m
        ));
      }
    } catch (error) {
      console.error('Pin action failed:', error);
    }
    setMenuConfig(null);
  };

  const handleDelete = async (message) => {
    try {
      const res = await messageService.deleteMessage(message._id);
      if (res.success) {
        setMessages(prev => prev.filter(m => m._id !== message._id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
    setMenuConfig(null);
  };

  const jumpToMessage = (message) => {
    const el = messageRefs.current[message._id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('animate-highlight');
      setTimeout(() => el.classList.remove('animate-highlight'), 2000);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !targetUser) return;
    const formData = new FormData();
    formData.append('receiverId', targetUser._id);
    formData.append('messageType', 'image');
    formData.append('image', file);
    if (conversation?._id) formData.append('conversationId', conversation._id);
    if (replyingTo?._id) formData.append('replyTo', replyingTo._id);

    try {
      setIsUploadingMedia(true);
      const res = await messageService.sendMediaMessage(formData, 'image');
      if (res.success) {
        setMessages(prev => [...prev, res.message]);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Failed to send image:', error);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleTyping = (typing) => {
    if (socket && conversation?._id && targetUser?._id) {
      socket.emit(typing ? 'typing_start' : 'typing_stop', {
        conversationId: conversation._id,
        receiverId: targetUser._id
      });
    }
  };

  const onInputChange = (e) => {
    setDraft(e.target.value);
    if (!isMeTypingRef.current && e.target.value.length > 0) {
      isMeTypingRef.current = true;
      handleTyping(true);
    } else if (isMeTypingRef.current && e.target.value.length === 0) {
      isMeTypingRef.current = false;
      handleTyping(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isMeTypingRef.current) {
        isMeTypingRef.current = false;
        handleTyping(false);
      }
    }, 3000);
  };

  return (
    <div className={`page-container pb-0 flex flex-col overflow-hidden h-screen relative transition-colors duration-300 ${theme.bgClass} ${theme.textClass}`}>
      {/* Context Menu Overlay */}
      {menuConfig && (
        <div 
          className="fixed inset-0 z-[100] bg-black/5" 
          onClick={() => setMenuConfig(null)}
          onContextMenu={(e) => { e.preventDefault(); setMenuConfig(null); }}
        >
          <div 
            className="absolute bg-[#242424] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5 py-2 min-w-[160px] animate-scale-in text-white"
            style={{ 
              top: Math.min(menuConfig.y, window.innerHeight - 200), 
              left: Math.min(menuConfig.x, window.innerWidth - 180) 
            }}
          >
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-white/10 flex items-center gap-3 border-b border-white/5"
              onClick={() => { setReplyingTo(menuConfig.message); setMenuConfig(null); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/></svg>
              Reply
            </button>
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-white/10 flex items-center gap-3 border-b border-white/5"
              onClick={() => handleCopy(menuConfig.message)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-white/10 flex items-center gap-3 border-b border-white/5"
              onClick={() => handlePin(menuConfig.message)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/></svg>
              {menuConfig.message.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold text-[#FE2C55] active:bg-[#FE2C55]/10 flex items-center gap-3"
              onClick={() => handleDelete(menuConfig.message)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
              Delete for you
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 border-b sticky top-0 z-50 transition-colors duration-300 ${theme.headerBg} ${theme.headerText}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className={`active:opacity-60 ${theme.headerText}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div 
              className={`flex items-center gap-3 ${isBlockedByThem ? 'cursor-default' : 'cursor-pointer'}`}
              onClick={() => !isBlockedByThem && navigate(`/user/${username}`)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                <img
                  src={displayAvatar}
                  alt={displayUsername}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <p className={`text-[15px] font-bold leading-tight ${theme.headerText}`}>
                  {displayName}
                </p>
                <p className="text-[12px] opacity-60 font-medium">
                  {isTyping && !isBlockedByThem ? <span className="text-[#FE2C55]">Typing...</span> : `@${displayUsername}`}
                </p>
              </div>
            </div>
          </div>
          
          {/* Header Options Dots Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowHeaderMenu(prev => !prev)} 
              className={`p-1.5 transition-colors rounded-full active:scale-95 ${
                theme === THEMES.midnight ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-black'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            
            {/* Options Menu Popover Dropdown */}
            {showHeaderMenu && (
              <>
                <div className="fixed inset-0 z-[80]" onClick={() => setShowHeaderMenu(false)} />
                <div 
                  className={`absolute right-0 mt-2 z-[90] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] border py-1.5 min-w-[190px] animate-scale-in transition-all ${
                    theme === THEMES.midnight 
                      ? 'bg-[#0E1017]/95 border-white/5 backdrop-blur-md text-white' 
                      : 'bg-[#242424]/95 border-white/5 backdrop-blur-md text-white'
                  }`}
                >
                  {!isBlockedByThem && (
                    <button 
                      className={`w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-opacity-50 flex items-center gap-3 border-b ${
                        theme === THEMES.midnight 
                          ? 'active:bg-white/5 border-white/5 hover:bg-white/5' 
                          : 'active:bg-white/5 border-white/5 hover:bg-white/5'
                      }`}
                      onClick={() => {
                        navigate(`/user/${username}`);
                        setShowHeaderMenu(false);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      View Profile
                    </button>
                  )}
                  <button 
                    className={`w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-opacity-50 flex items-center gap-3 border-b ${
                      theme === THEMES.midnight 
                        ? 'active:bg-white/5 border-white/5 hover:bg-white/5' 
                        : 'active:bg-gray-50 border-gray-50 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setIsSearching(true);
                      setShowHeaderMenu(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Search Chat
                  </button>
                  <button 
                    className={`w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-opacity-50 flex items-center gap-3 border-b ${
                      theme === THEMES.midnight 
                        ? 'active:bg-white/5 border-white/5 hover:bg-white/5' 
                        : 'active:bg-gray-50 border-gray-50 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setShowThemePicker(true);
                      setShowHeaderMenu(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"/></svg>
                    Change Theme
                  </button>
                  <button 
                    className={`w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-opacity-50 flex items-center gap-3 border-b ${
                      theme === THEMES.midnight 
                        ? 'active:bg-white/5 border-white/5 hover:bg-white/5' 
                        : 'active:bg-gray-50 border-gray-50 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (isBlocked) {
                        handleBlockToggle();
                      } else {
                        setShowBlockConfirmation(true);
                      }
                      setShowHeaderMenu(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button 
                    className={`w-full px-4 py-3 text-left text-[14px] font-semibold text-[#FE2C55] active:bg-opacity-50 flex items-center gap-3 ${
                      theme === THEMES.midnight 
                        ? 'active:bg-red-500/10 hover:bg-red-500/5' 
                        : 'active:bg-red-50 hover:bg-red-50/50'
                    }`}
                    onClick={() => {
                      setShowReportSheet(true);
                      setShowHeaderMenu(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    Report User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Message Bar */}
      <PinnedMessageBar 
        message={pinnedMessage} 
        onUnpin={handlePin} 
        onClick={jumpToMessage} 
        theme={theme}
      />

      {/* Search Input Sticky Bar */}
      {isSearching && (
        <div className={`px-4 py-2 border-b flex items-center gap-3 animate-slide-down sticky top-[58px] z-40 ${
          theme === THEMES.midnight ? 'bg-[#0E1017]/95 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-black'
        }`}>
          <div className={`flex-1 rounded-full border px-4 py-1.5 flex items-center gap-2 ${
            theme === THEMES.midnight ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-gray-400">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="flex-1 bg-transparent text-[14px] outline-none text-current placeholder:text-gray-400"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-current">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <button 
            onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
            className="text-[14px] font-semibold text-[#FE2C55] active:opacity-60 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Messages */}
      <div className={`scrollable flex-1 px-4 py-4 space-y-5 overflow-y-auto bg-transparent ${theme.scrollbarClass}`}>
        {isSearching && searchQuery.trim() ? (
          filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="mb-3">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-[14px] font-semibold">No results found</p>
              <p className="text-[12px] mt-1">Try searching for a different keyword.</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'} found
              </p>
              {filteredMessages.map((message) => {
                const isMe = message.sender?._id === currentUser?._id || message.sender === currentUser?._id;
                const senderName = isMe ? 'You' : (targetUser?.fullName || username);
                const isImage = message.messageType === 'image';
                
                return (
                  <div 
                    key={message._id || message.id}
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery('');
                      setTimeout(() => {
                        jumpToMessage(message);
                      }, 300);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.99] flex items-center justify-between gap-4 ${
                      theme === THEMES.midnight 
                        ? 'bg-white/5 border-white/5 hover:bg-white/10 text-white' 
                        : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-black'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-[#FE2C55]">{senderName}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">
                          {formatBubbleTimestamp(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13.5px] truncate leading-normal">
                        {isImage ? '📷 Image' : (message.content?.text || message.text)}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-gray-400 flex-shrink-0">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )
        ) : isSearching ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="#FE2C55" strokeWidth="2" viewBox="0 0 24 24" className="mb-3 animate-bounce-slow">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-[14px] font-semibold">Search Chat History</p>
            <p className="text-[12px] mt-1">Search for messages sent in this conversation.</p>
          </div>
        ) : (
          <>
            {messages.length === 0 && !loading && (
               <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                     </svg>
                  </div>
                  <p className="text-[14px]">Say hi to {targetUser?.fullName || username}!</p>
               </div>
            )}
            
            {messages.map((message, index) => {
              const isMe = message.sender?._id === currentUser?._id || message.sender === currentUser?._id;
              const nextMessage = messages[index + 1];
              const isNextMe = nextMessage?.sender?._id === currentUser?._id || nextMessage?.sender === currentUser?._id;
              const isLastInGroup = isMe !== isNextMe;

              return (
                <div key={message._id || message.id} ref={el => messageRefs.current[message._id || message.id] = el}>
                  <MessageBubble 
                    message={message}
                    isMe={isMe}
                    isLastInGroup={isLastInGroup}
                    targetUser={targetUser}
                    username={username}
                    onReply={(msg) => setReplyingTo(msg)}
                    onAction={handleAction}
                    theme={theme}
                  />
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex justify-start items-center gap-2 pl-9">
                <div className="bg-gray-50/20 px-3 py-2 rounded-full flex gap-1 items-center border border-gray-100/5">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}

            {isUploadingMedia && (
              <div className="flex justify-end items-center gap-2 pr-1 animate-pulse">
                <div className="bg-gray-50/20 px-3 py-2 rounded-[18px] flex gap-2 items-center border border-gray-100/5">
                  <div className="w-3 h-3 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-bold text-gray-400">Sending photo...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className={`px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-3 border-t transition-colors duration-300 ${theme.inputAreaBg}`}>
        {replyingTo && (
          <div className={`mb-2 p-3 rounded-[12px] border-l-[3px] border-[#FE2C55] flex justify-between items-center animate-slide-up ${
            theme === THEMES.midnight ? 'bg-white/5 text-white' : 'bg-gray-50 text-black'
          }`}>
            <div className="min-w-0 pr-4">
              <p className="text-[11px] font-bold text-[#FE2C55] mb-0.5">
                Replying to {replyingTo.sender?.fullName || replyingTo.sender?.username || 'user'}
              </p>
              <p className="text-[13px] opacity-60 truncate">
                {replyingTo.content?.text || replyingTo.text}
              </p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 opacity-60 hover:opacity-100">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        
        {isBlockedByThem ? (
          <div className={`flex flex-col items-center justify-center py-4 rounded-[18px] border px-4 text-center ${
            theme.scrollbarClass === 'dark-scrollbar'
              ? 'bg-zinc-950/40 border-zinc-800/30 text-white/50 animate-shake' 
              : 'bg-gray-50 border-gray-100 text-gray-400 animate-shake'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="mb-2 opacity-50">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p className="text-[13.5px] font-bold">This profile is unavailable</p>
            <p className="text-[11px] mt-0.5">You can no longer message this account.</p>
          </div>
        ) : isBlocked ? (
          <div className={`flex flex-col items-center justify-center py-4 rounded-[18px] border px-4 text-center ${
            theme === THEMES.midnight 
              ? 'bg-red-950/20 border-red-950/40 text-white animate-shake' 
              : 'bg-red-50 border-red-100 text-black animate-shake'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#FE2C55" viewBox="0 0 24 24" className="mb-2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p className="text-[13.5px] font-bold">You blocked this user</p>
            <button 
              onClick={handleBlockToggle}
              className="text-[12px] font-bold text-[#FE2C55] underline mt-1.5 active:opacity-60 transition-opacity"
            >
              Unblock to resume chat
            </button>
          </div>
        ) : privacyError ? (
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-[18px] border border-gray-100 px-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#FE2C55" viewBox="0 0 24 24" className="mb-2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p className="text-[13px] font-bold text-gray-800">{privacyError}</p>
            <p className="text-[11px] text-gray-400 mt-1">You cannot message this user due to their privacy settings.</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className={`flex-1 rounded-[24px] border border-transparent focus-within:border-gray-200/20 px-4 py-2.5 flex items-center gap-3 transition-all ${theme.inputBg}`}>
              <input
                type="text"
                value={draft}
                onChange={onInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend();
                  }
                }}
                placeholder="Message..."
                className="flex-1 bg-transparent text-[15px] outline-none text-current placeholder:text-gray-400"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 active:text-current transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                draft.trim()
                  ? 'bg-black text-white scale-100 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                  : 'bg-gray-50 text-black/30 scale-90 opacity-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="22" y1="2" x2="11" y2="13"></line>
                 <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      {showBlockConfirmation && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowBlockConfirmation(false)}>
          <div className="bg-[#242424] rounded-3xl p-6 max-w-[320px] w-full text-center shadow-2xl border border-white/5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-[#FE2C55]/10 flex items-center justify-center mx-auto mb-4 text-[#FE2C55]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </div>
            <h3 className="text-[18px] font-bold text-white mb-2">Block {targetUser?.fullName || username}?</h3>
            <p className="text-[13px] text-white/40 leading-relaxed mb-6">
              They will no longer be able to message you, view your profile, or watch your reels. You can unblock them at any time from Settings.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBlockConfirmation(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white text-[14px] font-bold rounded-xl active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleBlockToggle}
                className="flex-1 py-3 bg-[#FE2C55] hover:bg-[#E02447] text-white text-[14px] font-bold rounded-xl shadow-none active:scale-95 transition-all"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Picker Dialog */}
      {showThemePicker && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowThemePicker(false)}>
          <div className="bg-[#242424] rounded-3xl p-6 max-w-[340px] w-full shadow-2xl border border-white/5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-[18px] font-bold text-white">Chat Theme</h3>
              <button onClick={() => setShowThemePicker(false)} className="p-1 text-white/40 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {Object.entries(THEMES).map(([key, t]) => {
                const isSelected = activeThemeKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveThemeKey(key);
                      if (targetUser?._id) {
                        localStorage.setItem(`jhumroo_chat_theme_${targetUser._id}`, key);
                      }
                      setShowThemePicker(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2.5 transition-all duration-200 active:scale-95 ${
                      isSelected 
                        ? 'border-white bg-white/5 shadow-sm scale-100' 
                        : 'border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Circle Color Preview */}
                    <div className={`w-12 h-12 rounded-full shadow-inner flex items-center justify-center ${t.bgClass} border border-white/5 overflow-hidden relative`}>
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
                        <div className={`w-3.5 h-3.5 rounded-full ${t.bubbleMe}`} />
                        <div className={`w-3.5 h-3.5 rounded-full ${t.bubbleOther}`} />
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-white">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Report Sheet for Users */}
      <ReportUserSheet 
        isOpen={showReportSheet} 
        onClose={() => setShowReportSheet(false)} 
        userId={targetUser?._id}
      />
    </div>
  );
};

export default ChatPage;
