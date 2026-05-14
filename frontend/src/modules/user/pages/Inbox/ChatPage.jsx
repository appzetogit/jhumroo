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

const MessageBubble = ({ message, isMe, isLastInGroup, targetUser, username, onReply }) => {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e) => {
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

  const handleTouchEnd = () => {
    isSwiping.current = false;
    if (swipeX <= -50) {
      onReply(message);
    }
    setSwipeX(0);
  };

  return (
    <div 
      className={`relative w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-transform duration-200 ease-out cursor-default select-none overflow-x-hidden`}
      style={{ 
        transform: `translateX(${swipeX}px)`,
        touchAction: 'pan-y'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
  const isMeTypingRef = useRef(false);
  const fileInputRef = useRef(null);
  
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
            // Avoid duplicate messages
            if (prev.find(m => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });
          // Mark as read
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

      return () => {
        socket.emit('leave_conversation', conversation._id);
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('conversation_read');
      };
    }
  }, [socket, conversation?._id, currentUser?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  const fetchChatData = async () => {
    setLoading(true);
    try {
      // 1. Get target user details
      const userRes = await userService.getUserByUsername(username);
      if (userRes.success) {
        setTargetUser(userRes.user);
        
        // 2. Get or create conversation
        const convRes = await messageService.getConversation(userRes.user._id);
        if (convRes.success) {
          setConversation(convRes.conversation);
          
          // 3. Get messages
          const msgRes = await messageService.getMessages(convRes.conversation._id);
          if (msgRes.success) {
            setMessages(msgRes.messages);
            // Mark read
            messageService.markAsRead(convRes.conversation._id).catch(console.error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !targetUser) return;

    const messageText = draft.trim();
    setDraft('');
    
    // Stop typing immediately
    if (isMeTypingRef.current) {
        isMeTypingRef.current = false;
        handleTyping(false);
    }
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

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
      // Clear input
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
    <div className="page-container bg-white flex flex-col overflow-hidden text-black h-screen">
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
          
          <div className="flex items-center gap-4">
             {/* Icons removed as per user request */}
          </div>
        </div>
      </div>

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
            <MessageBubble 
              key={message._id || message.id}
              message={message}
              isMe={isMe}
              isLastInGroup={isLastInGroup}
              targetUser={targetUser}
              username={username}
              onReply={(msg) => setReplyingTo(msg)}
            />
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
      </div>


    </div>
  );
};

export default ChatPage;
