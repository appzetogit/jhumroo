import React, { useState, useEffect } from 'react';
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

const InboxPage = () => {
  const navigate = useNavigate();
  const { config } = useAppContent();
  const { user: currentUser } = useAuth();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (data) => {
        fetchConversations();
      });
      return () => socket.off('new_message');
    }
  }, [socket]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRequestsCount(),
      fetchConversations()
    ]);
    setLoading(false);
  };

  const fetchRequestsCount = async () => {
    try {
      const res = await followService.getFollowRequests(1, 1);
      if (res.success) {
        setPendingRequestsCount(res.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch requests count:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await messageService.getConversations();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  return (
    <div className="page-container bg-white flex flex-col overflow-hidden text-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <button className="text-black active:opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </button>
        <h2 className="text-[17px] font-bold text-black">Inbox</h2>
        <button className="text-black active:opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      <div className="scrollable flex-1 pt-2 pb-24">
        {/* Thoughts Section */}
        <div className="px-4 mb-6">
          <div className="relative inline-flex flex-col items-center group">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-gray-100 text-[13px] font-medium text-gray-400 whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white">
              Thoughts?
            </div>
            <div className="relative w-[72px] h-[72px] rounded-full p-[3px] border border-gray-100">
              <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden">
                <img
                  src={currentUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#00B2FF] border-2 border-white flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
            <span className="mt-2 text-[12px] font-semibold text-gray-900">Create</span>
          </div>
        </div>

        {/* Chats Section */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#FE2C55]"></div>
            </div>
          ) : conversations.length > 0 && (
            <div className="px-4 space-y-5">
              {conversations.map((conv) => (
                <div
                  key={conv._id}
                  className="flex items-center gap-4 cursor-pointer active:opacity-75"
                  onClick={() => navigate(`/inbox/chat/${conv.participant.username}`)}
                >
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      <img
                        src={conv.participant.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participant.username}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FE2C55] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-[15px] font-bold text-black truncate">
                        {conv.participant.fullName || conv.participant.username}
                      </p>
                      <p className="text-[12px] text-gray-400 shrink-0">
                        {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                      </p>
                    </div>
                    <p className={`text-[13px] truncate ${conv.unreadCount > 0 ? 'text-black font-semibold' : 'text-gray-400'}`}>
                      {conv.lastMessage?.messageType === 'text' ? conv.lastMessage.text :
                        conv.lastMessage?.messageType === 'image' ? 'Sent an image' :
                          conv.lastMessage?.messageType === 'video' ? 'Sent a video' :
                            conv.lastMessage?.messageType === 'reel' ? 'Shared a reel' : 'Start chatting'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
