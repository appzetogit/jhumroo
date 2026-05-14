import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BiMenu, BiUserPlus, BiBookmark, BiHeart, BiArrowBack, BiBell } from 'react-icons/bi';
import { BsGrid3X3 } from 'react-icons/bs';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';
import followService from '../../../../services/followService';

const VideoGrid = ({ videos, onVideoClick }) => {
  if (!videos || !videos.length) {
    return (
      <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0 0 10 10v4a1 1 0 0 0 1.555.832l3.197-2.132a1 1 0 0 0 0-1.664z"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
        <p className="text-white/30 text-sm">No videos yet</p>
      </div>
    );
  }
  return (
    <>
      {videos.map((video, idx) => {
        const thumbnail = video.video?.thumbnail || video.thumbnail || video.poster || video.video?.url || video.url;
        
        return (
          <div 
            key={idx} 
            className="relative aspect-[3/4] bg-surface overflow-hidden group cursor-pointer border-[0.5px] border-white/5"
            onClick={() => onVideoClick?.(video, idx)}
          >
            <img 
              src={thumbnail} 
              alt="reel-thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              onError={(e) => {
                // Fallback if thumbnail fails
                if (video.video?.url || video.url) {
                  e.target.style.display = 'none';
                  // You could potentially show a play icon or a frame here
                }
              }}
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" className="opacity-80">
                  <path d="M5 3l14 9-14 9z" />
                </svg>
            </div>
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[10px] font-bold drop-shadow-md theme-on-media">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M5 3l14 9-14 9z" />
              </svg>
              <span>{video.stats?.likesCount || video.likes || 0}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};

const ProfilePage = () => {
  const { isDarkMode } = useTheme();
  const { username: profileUsername } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { config } = useAppContent();



  const [activeTab, setActiveTab] = useState('videos');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState(null);
  const [isFollower, setIsFollower] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const [userVideos, setUserVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuggested, setShowSuggested] = useState(false);
  const [randomSuggestions, setRandomSuggestions] = useState([]);
  const [incomingFollowStatus, setIncomingFollowStatus] = useState(null);

  // Derived state
  const displayUsername = profileUsername || currentUser?.username || 'johnny_dance';
  const isOwnProfile = !profileUsername || 
    (profileUsername && currentUser?.username && profileUsername.toLowerCase() === currentUser.username.toLowerCase()) ||
    (profile?._id && currentUser?._id && profile._id === currentUser._id);
  const isPrivateAndLocked = !isOwnProfile && profile?.isPrivate && !isFollowing;

  useEffect(() => {
    fetchProfileData();
  }, [displayUsername]);

  useEffect(() => {
    if (activeTab === 'saves' || activeTab === 'likes') {
      fetchEngagementData();
    }
  }, [activeTab]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profile
      const profileRes = await userService.getUserByUsername(displayUsername);
      if (profileRes.success) {
        setProfile(profileRes.user);
        setIsFollowing(profileRes.user.isFollowing);
        setFollowStatus(profileRes.user.followStatus);
        setIsFollower(profileRes.user.isFollower);
        setIncomingFollowStatus(profileRes.user.incomingFollowStatus);
      }

      // 2. Fetch user reels
      const reelsRes = await userService.getUserReels(displayUsername);
      if (reelsRes.success) {
        setUserVideos(reelsRes.reels);
      }
      
      // Initial fetch for engagement if own profile
      if (isOwnProfile) {
        fetchEngagementData();
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagementData = async () => {
    if (!isOwnProfile) return;
    try {
      if (activeTab === 'likes') {
        const likedRes = await userService.getLikedReels();
        if (likedRes.success) setLikedVideos(likedRes.reels);
      } else if (activeTab === 'saves') {
        const savedRes = await userService.getSavedReels();
        if (savedRes.success) setSavedVideos(savedRes.reels);
      } else {
        // Fetch both on initial load
        const [likedRes, savedRes] = await Promise.all([
          userService.getLikedReels(),
          userService.getSavedReels()
        ]);
        if (likedRes.success) setLikedVideos(likedRes.reels);
        if (savedRes.success) setSavedVideos(savedRes.reels);
      }
    } catch (error) {
      console.error('Failed to fetch engagement data:', error);
    }
  };

  const handleToggleSuggested = () => {
    if (!showSuggested && randomSuggestions.length === 0) {
      const suggestions = [...(config?.users?.suggestions || [])];
      setRandomSuggestions(suggestions.sort(() => Math.random() - 0.5).slice(0, 6));
    }
    setShowSuggested(!showSuggested);
  };

  const handleSuggestedAccountClick = (account) => {
    if (account.type === 'user') {
      navigate(`/user/${account.username}`);
    }
  };

  const visibleSuggestions = randomSuggestions.filter(
    (account) => account.type !== 'user' || 
    (account.username?.toLowerCase() !== displayUsername?.toLowerCase() && 
     account.username?.toLowerCase() !== currentUser?.username?.toLowerCase())
  );

  const handleOpenChat = () => navigate(`/inbox/chat/${displayUsername}`);

  const handleAcceptRequest = async () => {
    try {
      const res = await followService.acceptFollowRequest(profile._id);
      if (res.success) {
        setIncomingFollowStatus('accepted');
        setIsFollower(true);
      }
    } catch (error) {
      console.error('Failed to accept follow request:', error);
    }
  };

  const handleRejectRequest = async () => {
    try {
      const res = await followService.rejectFollowRequest(profile._id);
      if (res.success) {
        setIncomingFollowStatus(null);
      }
    } catch (error) {
      console.error('Failed to reject follow request:', error);
    }
  };

  const handleFollow = async () => {
    if (isOwnProfile) return;
    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        // Unfollow or Cancel Request
        const res = await followService.unfollowUser(profile._id);
        if (res.success) {
          setIsFollowing(false);
          setFollowStatus(null);
          // Update profile stats locally
          if (followStatus === 'accepted') {
            setProfile(prev => ({
              ...prev,
              stats: {
                ...prev.stats,
                followersCount: Math.max(0, (prev.stats?.followersCount || 0) - 1)
              }
            }));
          }
        }
      } else {
        // Follow
        const res = await followService.followUser(profile._id);
        if (res.success) {
          // If profile is private, status should be 'pending' (Requested)
          const newStatus = res.status || (profile?.isPrivate ? 'pending' : 'accepted');
          setFollowStatus(newStatus);
          
          if (newStatus === 'accepted') {
            setIsFollowing(true);
            setProfile(prev => ({
              ...prev,
              stats: {
                ...prev.stats,
                followersCount: (prev.stats?.followersCount || 0) + 1
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  const handleVideoClick = (video, index) => {
    // Navigate to home feed with the selected video and the full list for scrolling
    let listToPass = [];
    if (activeTab === 'videos') listToPass = userVideos;
    else if (activeTab === 'likes') listToPass = likedVideos;
    else if (activeTab === 'saves') listToPass = savedVideos;

    navigate('/', { 
      state: { 
        searchVideos: listToPass,
        activeVideoId: video._id || video.id
      } 
    });
  };

  const getFollowButtonLabel = () => {
    if (followStatus === 'accepted') return 'Following';
    if (followStatus === 'pending') return 'Requested';
    if (isFollower) return 'Follow back';
    return 'Follow';
  };

  return (
    <div className="page-container theme-surface-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 shrink-0">
        {isOwnProfile ? (
          <>
            <div className="relative">
              <BiUserPlus size={24} className="text-white cursor-pointer active:opacity-70" onClick={() => navigate('/user/requests')} />
              {pendingRequestsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FE2C55] rounded-full flex items-center justify-center text-[10px] font-bold border border-black">
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </div>
              )}
            </div>
            <h2 className="text-[16px] font-bold text-white tracking-wide flex items-center gap-1">
              @{displayUsername}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </h2>
            <BiMenu size={28} className="text-white cursor-pointer active:opacity-70" onClick={() => navigate('/settings')} />
          </>
        ) : (
          <>
            <button onClick={() => navigate(-1)} className="text-white active:opacity-60">
              <BiArrowBack size={24} />
            </button>
            <h2 className="text-[16px] font-bold text-white">{displayUsername}</h2>
            <div className="w-6" /> {/* Placeholder to keep title centered if needed, or just leave empty */}
          </>
        )}
      </div>

      <div className="scrollable flex-1 pb-4">
        {/* User Info Section */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
          <div className="relative w-[100px] h-[100px] rounded-full p-1 mb-3">
            <img 
              src={profile?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUsername}`} 
              alt="avatar" 
              className="w-full h-full rounded-full object-cover bg-white/10" 
            />
            {isOwnProfile && (
              <div className="absolute right-0 bottom-0 w-6 h-6 bg-[#20D5EC] rounded-full border-2 border-black flex items-center justify-center text-white cursor-pointer shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
              </div>
            )}
          </div>
          <p className="text-[15px] font-bold text-white mb-4">@{displayUsername}</p>

          {/* Stats */}
          <div className="flex gap-10 mb-5">
            {[
              { label: 'Following', value: profile?.stats?.followingCount || 0, tabId: 'following' },
              { label: 'Followers', value: profile?.stats?.followersCount || 0, tabId: 'followers' },
              { label: 'Likes', value: profile?.stats?.likesCount || 0 },
            ].map(stat => (
              <div
                key={stat.label}
                className="flex flex-col items-center cursor-pointer active:opacity-70"
                onClick={() => {
                  if (stat.tabId) {
                    navigate(`/user/${displayUsername}/followers`, { state: { activeTab: stat.tabId } });
                  }
                }}
              >
                <strong className="text-[17px] font-bold text-white">{stat.value}</strong>
                <span className="text-[12px] text-white/50">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 w-full max-w-[320px] mb-4">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate('/settings/edit-profile')}
                  className={`flex-1 py-3 h-[42px] text-[14px] font-semibold flex items-center justify-center rounded-[4px] border transition-all duration-300 ease-in-out active:scale-[0.98] active:brightness-90 ${
                    isDarkMode
                      ? 'bg-white/10 border-white/5 text-white hover:bg-[#FE2C55] hover:border-[#FE2C55] hover:shadow-[0_4px_12px_rgba(254,44,85,0.3)]'
                      : 'bg-[#FE2C55] border-[#FE2C55] text-white shadow-[0_4px_12px_rgba(254,44,85,0.25)] hover:brightness-110'
                  }`}
                >
                  Edit profile
                </button>
                <button
                  onClick={handleToggleSuggested}
                  className="w-11 h-[42px] bg-white/10 rounded-[4px] flex items-center justify-center text-white active:bg-white/20 transition-colors border border-white/5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    className={`transition-transform duration-200 ${showSuggested ? 'rotate-180' : ''}`}
                  >
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {incomingFollowStatus === 'pending' ? (
                  <div className="flex-1 flex gap-1.5">
                    <button
                      onClick={handleAcceptRequest}
                      className="flex-1 h-[42px] bg-[#FE2C55] text-white text-[15px] font-bold rounded-[4px] active:scale-95 transition-all"
                    >
                      Accept
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      className="flex-1 h-[42px] bg-white/10 text-white text-[15px] font-bold rounded-[4px] border border-white/10 active:scale-95 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`flex-1 h-[42px] rounded-[4px] text-[15px] font-bold transition-all active:scale-95 ${
                      followStatus === 'accepted' 
                        ? 'border border-white/20 text-white bg-transparent' 
                        : followStatus === 'pending'
                          ? 'bg-white/10 text-white/60 border border-white/10'
                          : 'bg-[#FE2C55] text-white'
                    }`}
                  >
                    {getFollowButtonLabel()}
                  </button>
                )}
                <button
                  onClick={handleOpenChat}
                  className="w-11 h-[42px] border border-white/30 rounded-[4px] flex items-center justify-center text-white active:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2 11 13" />
                    <path d="m22 2-7 20-4-9-9-4Z" />
                  </svg>
                </button>
                <button
                  onClick={handleToggleSuggested}
                  className="w-11 h-[42px] border border-white/30 rounded-[4px] flex items-center justify-center text-white active:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    className={`transition-transform duration-200 ${showSuggested ? 'rotate-180' : ''}`}
                  >
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Bio */}
          {!showSuggested && (
            <p className="text-[13px] text-white/80 text-center leading-relaxed whitespace-pre-line px-4">
              {profile?.bio || 'No bio yet'}
            </p>
          )}
        </div>

        {/* Random Suggested Accounts Section */}
        {showSuggested && visibleSuggestions.length > 0 && (
          <div className="px-4 pb-4 animate-fade-in-down">
            <div className="flex items-center justify-between mb-3 text-white">
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="text-[13px] font-semibold">Suggested accounts</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <span className="text-[13px] font-semibold opacity-60 active:opacity-100 cursor-pointer" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'suggested' } })}>View all <span className="text-[10px]">&gt;</span></span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-2">
              {visibleSuggestions.map(account => (
                <div
                  key={account.id}
                  className={`snap-start flex-none w-[130px] bg-white/5 rounded-md p-3 pb-4 flex flex-col items-center relative border border-white/5 shadow-sm h-[190px] justify-between ${account.type === 'user' ? 'cursor-pointer active:opacity-90' : ''}`}
                  onClick={() => handleSuggestedAccountClick(account)}
                >
                  <button className="absolute top-2.5 right-2.5 text-white/30 active:opacity-100 z-10 p-1" onClick={(e) => { e.stopPropagation(); setRandomSuggestions(prev => prev.filter(c => c.id !== account.id)); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>

                  {account.type === 'platform' ? (
                    <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mb-1 mt-1 shrink-0 ${account.color}`}>
                      {account.platform === 'Facebook' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/></svg>
                      )}
                    </div>
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-1 mt-1 shrink-0 bg-white/10">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account.username}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="w-full flex flex-col items-center mt-1 flex-1">
                    <div className="flex items-center justify-center w-full">
                      <p className="text-white text-[13px] font-bold text-center truncate pr-[2px]">{account.name}</p>
                      {account.verified && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#20D5EC"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      )}
                    </div>
                    <p className="text-white/50 text-[11px] font-medium truncate w-full text-center mt-0.5">{account.subtitle}</p>
                  </div>

                  <button
                    className="w-full py-[7px] mt-2 bg-[#FE2C55] text-white text-[13px] font-bold rounded-[4px] active:brightness-90 shadow-sm shrink-0"
                    onClick={() => handleSuggestedAccountClick(account)}
                  >
                    {account.actionText || 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Playlist chips */}
        {profile?.playlists && (
          <div className="flex gap-2 px-4 pb-4 overflow-x-auto no-scrollbar">
            {profile.playlists.map((p, i) => (
              <div key={i} className="flex-none flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-white text-[12px] font-medium whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white" opacity="0.6"><path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/></svg>
                {p.name || p}
              </div>
            ))}
          </div>
        )}

        {/* Profile Tabs */}
        <div className="flex border-t border-white/5 pt-1">
          {[
            { id: 'videos', icon: <BsGrid3X3 size={20} /> },
            ...(isOwnProfile ? [{ id: 'saves', icon: <BiBookmark size={20} /> }] : []),
            { id: 'likes', icon: <BiHeart size={20} /> }
          ].map(tab => (
            <div
              key={tab.id}
              className={`flex-1 flex justify-center py-3 relative cursor-pointer ${
                activeTab === tab.id ? 'text-white' : 'text-white/30'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {activeTab === tab.id && (
                <div className="theme-tab-indicator absolute bottom-0 left-0 w-full h-[2px]"></div>
              )}
            </div>
          ))}
        </div>

        {/* Grid Content */}
        <div className="grid grid-cols-3 gap-[1px]">
          {isPrivateAndLocked ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-2 text-white/50">
              <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center mb-2 mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <p className="text-[16px] font-bold text-white mb-0.5">This account is private</p>
              <p className="text-[13px] text-white/60">Follow this account to see their videos and likes.</p>
            </div>
          ) : (
            <>
              {activeTab === 'videos' && (
                <VideoGrid 
                  videos={userVideos} 
                  onVideoClick={handleVideoClick} 
                />
              )}

              {activeTab === 'saves' && isOwnProfile && (
                savedVideos.length > 0 ? (
                  <VideoGrid 
                    videos={savedVideos} 
                    onVideoClick={handleVideoClick} 
                  />
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-white/30">
                    <BiBookmark size={48} opacity={0.5} />
                    <p className="text-sm">No saved videos yet</p>
                  </div>
                )
              )}

              {activeTab === 'likes' && isOwnProfile && (
                likedVideos.length > 0 ? (
                  <VideoGrid 
                    videos={likedVideos} 
                    onVideoClick={handleVideoClick} 
                  />
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-white/30">
                    <BiHeart size={48} opacity={0.5} />
                    <p className="text-sm">No liked videos yet</p>
                  </div>
                )
              )}

              {(!isOwnProfile && (activeTab === 'likes' || activeTab === 'saves')) && (
                <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-2 text-white/30">
                  <BiBookmark size={40} opacity={0.5} />
                  <p className="text-sm">{`This user's content is private`}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
