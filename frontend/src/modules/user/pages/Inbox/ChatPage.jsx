import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useSocket } from '../../../../context/SocketContext';
import { useAuth } from '../../../../context/AuthContext';
import messageService from '../../../../services/messageService';
import userService from '../../../../services/userService';

const formatBubbleTimestamp = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const MessageBubble = ({ message, isMe, isLastInGroup, targetUser, username, onReply, onAction }) => {
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
            <div className={`text-[12px] px-3 py-1.5 rounded-[12px] opacity-60 border-l-2 bg-gray-50 max-w-fit ${isMe ? 'self-end border-[#FE2C55]' : 'self-start border-gray-300'}`}>
               <p className="font-bold text-[10px] truncate">
                  {message.replyTo.sender?.username || 'user'}
               </p>
               <p className="truncate max-w-[150px]">
                  {message.replyTo.content?.text || message.replyTo.text}
               </p>
            </div>
          )}
            {message.messageType === 'image' ? (
              <div className={`rounded-[18px] overflow-hidden border border-gray-100 shadow-sm ${isMe ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}>
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
                    ? 'bg-[#FE2C55] text-white rounded-[18px] rounded-br-[4px]'
                    : 'bg-gray-100 text-black rounded-[18px] rounded-bl-[4px]'
                }`}
              >
                {message.content?.text || message.text}
              </div>
            )}
        </div>
      </div>
      
      <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'pr-1' : 'pl-9'}`}>
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
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

const PinnedMessageBar = ({ message, onUnpin, onClick }) => {
  if (!message) return null;

  return (
    <div 
      className="px-4 py-2.5 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 flex items-center gap-3 cursor-pointer active:bg-gray-100 transition-all animate-slide-down sticky top-0 z-[40]"
      onClick={() => onClick(message)}
    >
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#666" viewBox="0 0 24 24">
          <path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-black truncate leading-tight">
          {message.content?.text || message.text}
        </p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Pinned Message</p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onUnpin(message); }}
        className="p-1.5 text-gray-300 hover:text-[#FE2C55] transition-colors"
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
  const { user: currentUser } = useAuth();
  
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
    <div className="page-container bg-white flex flex-col overflow-hidden text-black h-screen relative">
      {/* Context Menu Overlay */}
      {menuConfig && (
        <div 
          className="fixed inset-0 z-[100] bg-black/5" 
          onClick={() => setMenuConfig(null)}
          onContextMenu={(e) => { e.preventDefault(); setMenuConfig(null); }}
        >
          <div 
            className="absolute bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 py-2 min-w-[160px] animate-scale-in"
            style={{ 
              top: Math.min(menuConfig.y, window.innerHeight - 200), 
              left: Math.min(menuConfig.x, window.innerWidth - 180) 
            }}
          >
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-gray-50 flex items-center gap-3 border-b border-gray-50"
              onClick={() => { setReplyingTo(menuConfig.message); setMenuConfig(null); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/></svg>
              Reply
            </button>
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-gray-50 flex items-center gap-3 border-b border-gray-50"
              onClick={() => handleCopy(menuConfig.message)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold active:bg-gray-50 flex items-center gap-3 border-b border-gray-50"
              onClick={() => handlePin(menuConfig.message)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 3v2h5v7l1 1 1-1v-7h5v-2l-2-3z"/></svg>
              {menuConfig.message.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button 
              className="w-full px-4 py-3 text-left text-[14px] font-semibold text-[#FE2C55] active:bg-red-50 flex items-center gap-3"
              onClick={() => handleDelete(menuConfig.message)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
              Delete for you
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="text-black active:opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${username}`)}>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                <img
                  src={targetUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <p className="text-[15px] font-bold text-black leading-tight">
                  {targetUser?.fullName || username}
                </p>
                <p className="text-[12px] text-gray-400 font-medium">
                  {isTyping ? <span className="text-[#FE2C55]">Typing...</span> : `@${username}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Message Bar */}
      <PinnedMessageBar 
        message={pinnedMessage} 
        onUnpin={handlePin} 
        onClick={jumpToMessage} 
      />

      {/* Messages */}
      <div className="scrollable flex-1 px-4 py-4 space-y-5 overflow-y-auto bg-white">
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
              />
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start items-center gap-2 pl-9">
            <div className="bg-gray-50 px-3 py-2 rounded-full flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75" />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}

        {isUploadingMedia && (
          <div className="flex justify-end items-center gap-2 pr-1 animate-pulse">
            <div className="bg-gray-50 px-3 py-2 rounded-[18px] flex gap-2 items-center border border-gray-100">
              <div className="w-3 h-3 border-2 border-[#FE2C55] border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-gray-400">Sending photo...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-3 bg-white border-t border-gray-100">
        {replyingTo && (
          <div className="mb-2 p-3 bg-gray-50 rounded-[12px] border-l-[3px] border-[#FE2C55] flex justify-between items-center animate-slide-up">
            <div className="min-w-0 pr-4">
              <p className="text-[11px] font-bold text-[#FE2C55] mb-0.5">
                Replying to {replyingTo.sender?.fullName || replyingTo.sender?.username || 'user'}
              </p>
              <p className="text-[13px] text-gray-500 truncate">
                {replyingTo.content?.text || replyingTo.text}
              </p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-black">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        
        {privacyError ? (
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-[18px] border border-gray-100 px-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#FE2C55" viewBox="0 0 24 24" className="mb-2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p className="text-[13px] font-bold text-gray-800">{privacyError}</p>
            <p className="text-[11px] text-gray-400 mt-1">You cannot message this user due to their privacy settings.</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-[24px] bg-gray-100 border border-transparent focus-within:border-gray-200 px-4 py-2.5 flex items-center gap-3 transition-all">
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
                className="flex-1 bg-transparent text-[15px] text-black placeholder:text-gray-400 outline-none"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 active:text-black transition-colors"
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
    </div>
  );
};

export default ChatPage;
