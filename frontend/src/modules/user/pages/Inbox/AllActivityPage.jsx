import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../../../services/notificationService';
import followService from '../../../../services/followService';

const ActivityItem = ({ item }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.reel) {
      navigate(`/reel/${item.reel._id}`);
    } else if (item.sender) {
      navigate(`/user/${item.sender.username}`);
    }
  };

  const getActionText = () => {
    switch (item.type) {
      case 'like': return 'liked your video';
      case 'comment': return 'commented on your video';
      case 'mention': return 'mentioned you in a comment';
      case 'message': return 'sent you a message';
      case 'follow': return 'started following you';
      case 'follow_back': return item.sender?.isFollower ? 'followed you back' : 'started following you';
      case 'follow_accept': return 'accepted your follow request';
      default: return null;
    }
  };

  const actionText = getActionText();
  if (!actionText) return null;

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 active:bg-white/5 cursor-pointer transition-colors" onClick={handleClick}>
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-white/10 overflow-hidden shrink-0 border border-white/5">
        <img 
          src={item.sender?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.sender?.username}`} 
          alt={item.sender?.username} 
          className="w-full h-full object-cover rounded-full" 
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white leading-snug">
          <span className="font-bold text-white">{item.sender?.username || 'Someone'}</span>
          {' '}<span className="text-white/80">{actionText}</span>{' '}
          <span className="text-white/40 text-[11px] font-medium">{getTimeAgo(item.createdAt)}</span>
        </p>
      </div>

      {/* Video thumbnail (for reel interactions) */}
      {item.reel && (
        <div className="w-10 h-14 rounded bg-white/10 overflow-hidden shrink-0 border border-white/5">
          <img 
            src={item.reel.video?.thumbnail || item.reel.video?.url} 
            alt="thumb" 
            className="w-full h-full object-cover opacity-90" 
          />
        </div>
      )}
    </div>
  );
};

const AllActivityPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupNotifications = () => {
    const groups = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    notifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= today) groups.Today.push(n);
      else if (date >= yesterday) groups.Yesterday.push(n);
      else if (date >= lastWeek) groups['This Week'].push(n);
      else groups.Older.push(n);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  return (
    <div className="page-container theme-surface-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white active:opacity-60 w-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button className="flex items-center gap-1 text-[15px] font-bold text-white active:opacity-70">
          All activity
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div className="w-8" />
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="opacity-20 mb-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            <p className="text-sm">Notifications will appear here</p>
          </div>
        ) : (
          groupNotifications().map(([group, items]) => (
            <div key={group}>
              <div className="px-4 pt-4 pb-1">
                <span className="text-[12px] font-semibold text-white/40">{group}</span>
              </div>
              {items.map(item => (
                <ActivityItem key={item._id} item={item} />
              ))}
            </div>
          ))
        )}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default AllActivityPage;
