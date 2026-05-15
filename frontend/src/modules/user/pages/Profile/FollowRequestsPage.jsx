import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiArrowBack, BiChevronRight } from 'react-icons/bi';
import followService from '../../../../services/followService';
import notificationService from '../../../../services/notificationService';

const NotificationItem = ({ notification, onToggleFollow }) => {
  const navigate = useNavigate();
  const { sender, type, createdAt } = notification;
  const [followStatus, setFollowStatus] = useState(sender?.followStatus || (sender?.isFollowing ? 'accepted' : null));
  const [loading, setLoading] = useState(false);

  const handleOpenProfile = () => navigate(`/user/${sender?.username}`);

  const handleToggleFollow = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        const res = await followService.unfollowUser(sender?._id);
        if (res.success) setFollowStatus(null);
      } else {
        const res = await followService.followUser(sender?._id);
        if (res.success) {
          setFollowStatus(res.status || 'accepted');
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const getActionText = () => {
    switch (type) {
      case 'follow': return 'started following you.';
      case 'follow_accept': return 'accepted your follow request.';
      case 'follow_request': return 'requested to follow you.';
      case 'like': return 'liked your video.';
      case 'comment': return 'commented on your video.';
      case 'mention': return notification.comment ? 'mentioned you in a comment.' : 'mentioned you in a post.';
      default: return 'interacted with you.';
    }
  };

  if (!sender) return null;

  return (
    <div className="flex items-center px-4 py-3 gap-3 active:bg-gray-50 transition-colors cursor-pointer" onClick={handleOpenProfile}>
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full p-[2px] border-2 border-gray-100 overflow-hidden">
          <img 
            src={sender.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sender.username}`} 
            alt={sender.username} 
            className="w-full h-full object-cover rounded-full" 
          />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-[13px] leading-snug">
          <span className="font-bold text-gray-900">{sender.username}</span>
          <span className="text-gray-800 ml-1">
             {getActionText()}
          </span>
          <span className="text-gray-400 ml-1.5">{getTimeAgo(createdAt)}</span>
        </p>
      </div>

      {['like', 'comment', 'mention'].includes(type) && notification.reel ? (
        <div className="shrink-0 w-10 h-14 rounded bg-gray-100 overflow-hidden border border-gray-200">
          <img 
            src={notification.reel.video?.thumbnail || notification.reel.video?.url} 
            alt="reel" 
            className="w-full h-full object-cover" 
          />
        </div>
      ) : (
        <div className="shrink-0">
          <button
            onClick={handleToggleFollow}
            disabled={loading}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all active:scale-95 min-w-[90px] border ${
              followStatus === 'accepted' 
                ? 'bg-gray-100 text-gray-900 border-gray-200' 
                : followStatus === 'pending'
                ? 'bg-gray-100 text-gray-700 border-gray-300 shadow-sm'
                : 'bg-[#0095F6] text-white border-transparent'
            }`}
          >
            {loading ? '...' : followStatus === 'accepted' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow back'}
          </button>
        </div>
      )}
    </div>
  );
};

const FollowRequestsPage = () => {
  const navigate = useNavigate();
  const [requestsCount, setRequestsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [reqRes, notifRes] = await Promise.all([
        followService.getFollowRequests(1, 1), // Just for count
        notificationService.getNotifications(1, 50)
      ]);
      
      if (reqRes.success) {
        setRequestsCount(reqRes.pagination.total);
      }
      
      if (notifRes.success) {
        setNotifications(notifRes.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      'Last 7 days': [],
      Earlier: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    notifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= today) groups.Today.push(n);
      else if (date >= yesterday) groups.Yesterday.push(n);
      else if (date >= last7Days) groups['Last 7 days'].push(n);
      else groups.Earlier.push(n);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [notifications]);

  return (
    <div className="page-container bg-white flex flex-col min-h-screen text-black">
      {/* Header */}
      <div className="flex items-center px-4 py-4 shrink-0 bg-white sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-black active:opacity-60 mr-8">
          <BiArrowBack size={26} />
        </button>
        <h2 className="text-[20px] font-bold text-black">Notifications</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Follow Requests Entry - Always show */}
        <div 
          className="flex items-center px-4 py-4 gap-4 cursor-pointer active:bg-gray-50 transition-colors border-b border-gray-50"
          onClick={() => navigate('/user/requests/pending')}
        >
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              {requestsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FE2C55] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  {requestsCount}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-gray-900">Follow requests</p>
            <p className="text-[13px] text-gray-400">Approve or ignore requests</p>
          </div>
          <div className="text-gray-300">
            <BiChevronRight size={24} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0095F6]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
             <p className="text-gray-400 text-[14px]">No notifications yet.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-10">
            {groupedNotifications.map(([title, items]) => (
              <div key={title} className="mt-4">
                <div className="px-4 py-2 text-[15px] font-bold text-gray-900">
                  {title}
                </div>
                {items.map(n => (
                  <NotificationItem 
                    key={n._id} 
                    notification={n} 
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowRequestsPage;
