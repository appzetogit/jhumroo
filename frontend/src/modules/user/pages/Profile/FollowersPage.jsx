import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppContent } from '../../../../hooks/useAppContent';
import userService from '../../../../services/userService';
import followService from '../../../../services/followService';

const UserCard = ({ user }) => {
  const [following, setFollowing] = useState(user.isFollowing || false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleOpenProfile = () => navigate(`/user/${user.username}`);

  const handleFollowAction = async (e) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
      if (following) {
        const res = await followService.unfollowUser(user._id);
        if (res.success) setFollowing(false);
      } else {
        const res = await followService.followUser(user._id);
        if (res.success) setFollowing(true);
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center px-4 py-3 gap-3 cursor-pointer active:opacity-80"
      onClick={handleOpenProfile}
    >
      <div
        className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10 p-0.5"
      >
        <img 
          src={user.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
          alt={user.username} 
          className="w-full h-full object-cover rounded-full bg-white/10" 
        />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1">
          <p className="text-white font-bold text-[14px] truncate">{user.username}</p>
          {user.isVerified && (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#20D5EC">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          )}
        </div>
        <p className="text-white/40 text-[12px] truncate">{user.fullName || user.username}</p>
        {user.stats?.followersCount !== undefined && (
          <p className="text-white/30 text-[11px] truncate">{user.stats.followersCount} followers</p>
        )}
      </div>
      <button
        onClick={handleFollowAction}
        disabled={loading}
        className={`px-5 py-1.5 rounded-md text-[13px] font-bold transition-all active:scale-95 shrink-0 ${
          following
            ? 'border border-white/30 text-white bg-transparent'
            : 'bg-[#FE2C55] text-white'
        } ${loading ? 'opacity-50' : ''}`}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
};

const FollowersPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'followers');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [username]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profile to get userId and stats
      const profileRes = await userService.getUserByUsername(username);
      if (profileRes.success) {
        setProfile(profileRes.user);
        const userId = profileRes.user._id;

        // 2. Fetch data based on userId
        const [followersRes, followingRes, suggestedRes] = await Promise.all([
          followService.getFollowers(userId),
          followService.getFollowing(userId),
          userService.getSuggestedUsers(15)
        ]);

        if (followersRes.success) setFollowers(followersRes.followers);
        if (followingRes.success) setFollowing(followingRes.following);
        if (suggestedRes.success) setSuggested(suggestedRes.users);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'following', label: `Following`, count: profile?.stats?.followingCount || 0 },
    { id: 'followers', label: `Followers`, count: profile?.stats?.followersCount || 0 },
    { id: 'suggested', label: 'Suggested', count: null },
  ];

  const getCurrentList = () => {
    if (activeTab === 'followers') return followers;
    if (activeTab === 'following') return following;
    if (activeTab === 'suggested') return suggested;
    return [];
  };

  const currentUsers = getCurrentList();

  return (
    <div className="page-container theme-surface-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white active:opacity-60 w-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-[16px] font-bold text-white">{username || 'Profile'}</h2>
        <div className="w-8" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 py-3 text-[13px] font-semibold relative transition-colors ${
              activeTab === tab.id ? 'text-white' : 'text-white/40'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="flex flex-col items-center">
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="text-[11px] opacity-60 font-normal">{tab.count}</span>
              )}
            </div>
            {activeTab === tab.id && (
              <div className="theme-tab-indicator absolute bottom-0 left-0 w-full h-[2px] rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FE2C55]"></div>
          </div>
        ) : currentUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-20">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-[14px]">No accounts found</p>
          </div>
        ) : (
          <div className="pt-1 pb-10 fade-in-animation">
            {currentUsers.map((user, idx) => (
              <UserCard key={`${user.username}-${idx}`} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowersPage;
