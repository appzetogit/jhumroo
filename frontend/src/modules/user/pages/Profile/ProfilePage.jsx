import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BiMenu, BiUserPlus, BiBookmark, BiHeart, BiArrowBack, BiBell, BiDotsVerticalRounded, BiX } from 'react-icons/bi';
import { BsGrid3X3 } from 'react-icons/bs';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';
import followService from '../../../../services/followService';
import ProfileMoreOptionsSheet from '../../components/modals/ProfileMoreOptionsSheet';
import ReportSheet from '../../components/modals/ReportSheet';
import ReportUserSheet from '../../components/modals/ReportUserSheet';
import VideoCard from '../../components/video/VideoCard';

const VideoGrid = ({ videos, onVideoClick }) => {
  if (!videos || !videos.length) {
    return (
      <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0 0 10 10v4a1 1 0 0 0 1.555.832l3.197-2.132a1 1 0 0 0 0-1.664z"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
        <p className="text-white/30 text-sm">No videos yet</p>
      </div>
    );
  }
  return (
    <>
      {videos.map((video, idx) => {
        const thumbnailSrc = video.video?.thumbnail || video.thumbnail || video.poster;
        const hasThumbnail = thumbnailSrc && 
          typeof thumbnailSrc === 'string' && 
          !thumbnailSrc.endsWith('.mp4') && 
          !thumbnailSrc.endsWith('.webm') && 
          thumbnailSrc.trim() !== '' &&
          !thumbnailSrc.includes('1618005182384');
        
        return (
          <div 
            key={idx} 
            className="relative aspect-[3/4] bg-surface overflow-hidden group cursor-pointer border-[0.5px] border-white/5"
            onClick={() => onVideoClick?.(video, idx)}
          >
            {hasThumbnail ? (
              <img 
                src={thumbnailSrc} 
                alt="reel-thumbnail"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <video 
                src={video.video?.url || video.url} 
                preload="metadata"
                muted
                playsInline
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
            )}
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
  const { user: currentUser, updateUser } = useAuth();
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
  const [showOptions, setShowOptions] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [overlayVideos, setOverlayVideos] = useState([]);
  const [activeOverlayIndex, setActiveOverlayIndex] = useState(null);
  const [justOpenedOverlay, setJustOpenedOverlay] = useState(false);
  const overlayContainerRef = useRef(null);

  const displayUsername = profileUsername || currentUser?.username || 'user';
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

  useEffect(() => {
    const handlePopState = () => {
      if (activeOverlayIndex !== null) {
        setActiveOverlayIndex(null);
        setOverlayVideos([]);
        document.body.removeAttribute('data-reel-overlay-open');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeOverlayIndex]);

  useEffect(() => {
    return () => {
      document.body.removeAttribute('data-reel-overlay-open');
    };
  }, []);

  useEffect(() => {
    if (activeOverlayIndex !== null && justOpenedOverlay && overlayContainerRef.current) {
      const card = overlayContainerRef.current.querySelector(`[data-index="${activeOverlayIndex}"]`);
      if (card) {
        card.scrollIntoView({ block: 'start' });
        setJustOpenedOverlay(false);
      }
    }
  }, [activeOverlayIndex, justOpenedOverlay, overlayVideos]);

  useEffect(() => {
    if (activeOverlayIndex === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveOverlayIndex(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = overlayContainerRef.current?.querySelectorAll('.overlay-video-card-wrapper');
    elements?.forEach((el) => observer.observe(el));
    return () => elements?.forEach((el) => observer.unobserve(el));
  }, [activeOverlayIndex, overlayVideos]);

  useEffect(() => {
    const container = overlayContainerRef.current;
    if (!container || activeOverlayIndex === null) return;

    let isScrolling = false;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || overlayVideos.length <= 1) {
        return;
      }
      e.preventDefault();

      if (isScrolling) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex = activeOverlayIndex + direction;

      if (nextIndex >= 0 && nextIndex < overlayVideos.length) {
        isScrolling = true;
        
        const nextCard = container.querySelector(`[data-index="${nextIndex}"]`);
        if (nextCard) {
          nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        setTimeout(() => {
          isScrolling = false;
        }, 600);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [activeOverlayIndex, overlayVideos.length]);

  useEffect(() => {
    if (activeOverlayIndex === null || overlayVideos.length <= 1) return;

    const handleKeyDown = (e) => {
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.tagName !== 'DIV') {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = activeOverlayIndex + direction;

        if (nextIndex >= 0 && nextIndex < overlayVideos.length) {
          const container = overlayContainerRef.current;
          const nextCard = container?.querySelector(`[data-index="${nextIndex}"]`);
          nextCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOverlayIndex, overlayVideos.length]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const profileRes = await userService.getUserByUsername(displayUsername);
      if (profileRes.success) {
        setProfile(profileRes.user);
        setIsFollowing(profileRes.user.isFollowing);
        setFollowStatus(profileRes.user.followStatus);
        setIsFollower(profileRes.user.isFollower);
        setIncomingFollowStatus(profileRes.user.incomingFollowStatus);
        setIsBlocked(currentUser?.blockedUsers?.includes(profileRes.user._id));
      }

      const reelsRes = await userService.getUserReels(displayUsername);
      if (reelsRes.success) {
        setUserVideos(reelsRes.reels);
      }
      
      if (isOwnProfile) {
        fetchEngagementData();
        fetchPendingRequestsCount();
      }
    } catch (error) {
      if (!error?.isPrivate) {
        console.error('Failed to fetch profile data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequestsCount = async () => {
    try {
      const res = await followService.getFollowRequestsCount();
      if (res.success) {
        setPendingRequestsCount(res.count);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests count:', error);
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

  const handleToggleSuggested = async () => {
    if (!showSuggested && randomSuggestions.length === 0) {
      try {
        const res = await userService.getSuggestedUsers(10);
        if (res.success && res.users) {
          const formatted = res.users.map(u => ({
            id: u._id,
            username: u.username,
            name: u.fullName || u.username,
            subtitle: 'Suggested for you',
            type: 'user',
            verified: u.isVerified
          }));
          setRandomSuggestions(formatted.sort(() => Math.random() - 0.5).slice(0, 6));
        }
      } catch (error) {
        console.error('Failed to fetch suggested users:', error);
      }
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
        const res = await followService.unfollowUser(profile._id);
        if (res.success) {
          setIsFollowing(false);
          setFollowStatus(null);
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
        const res = await followService.followUser(profile._id);
        if (res.success) {
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
    let listToPass = [];
    if (activeTab === 'videos') listToPass = userVideos;
    else if (activeTab === 'likes') listToPass = likedVideos;
    else if (activeTab === 'saves') listToPass = savedVideos;

    setOverlayVideos(listToPass);
    setActiveOverlayIndex(index);
    setJustOpenedOverlay(true);
    document.body.setAttribute('data-reel-overlay-open', 'true');
    window.history.pushState({ overlayOpen: true }, '');
  };

  const handleCloseOverlay = () => {
    setActiveOverlayIndex(null);
    setOverlayVideos([]);
    document.body.removeAttribute('data-reel-overlay-open');
    if (window.history.state?.overlayOpen) {
      window.history.back();
    }
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `${profile?.fullName || displayUsername}'s Profile`,
      text: `Check out ${displayUsername}'s profile on Jhumroo!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Profile link copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing profile:', err);
      }
    }
  };

  const getFollowButtonLabel = () => {
    if (followStatus === 'accepted') return 'Following';
    if (followStatus === 'pending') return 'Requested';
    if (isFollower) return 'Follow back';
    return 'Follow';
  };

  const handleBlockToggle = async () => {
    try {
      const res = await userService.blockUser(profile._id);
      if (res.success) {
        setIsBlocked(res.isBlocked);
        
        // Update global user state for consistency
        if (currentUser && updateUser) {
          const updatedBlockedUsers = res.isBlocked
            ? [...(currentUser.blockedUsers || []), profile._id]
            : (currentUser.blockedUsers || []).filter(id => id !== profile._id);
          
          updateUser({
            ...currentUser,
            blockedUsers: updatedBlockedUsers
          });
        }

        if (res.isBlocked) {
          setIsFollowing(false);
          setFollowStatus(null);
          setIsFollower(false);
        }
        setShowOptions(false);
      }
    } catch (error) {
      console.error('Block action failed:', error);
    }
  };

  const handleReportUser = () => {
    setShowOptions(false);
    setShowReport(true);
  };

  return (
    <div className="page-container bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        {isOwnProfile ? (
          <button onClick={() => navigate('/user/requests')} className="text-black active:opacity-60 relative">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="26" height="26" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            {pendingRequestsCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FE2C55] rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </div>
            )}
          </button>
        ) : (
          <button onClick={() => navigate(-1)} className="text-black active:opacity-60">
            <BiArrowBack size={26} />
          </button>
        )}
        <h2 className="text-[17px] font-bold text-black">{profile?.fullName || displayUsername}</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleShareProfile}
            className="text-black active:opacity-60 transition-opacity"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          <button 
            onClick={() => isOwnProfile ? navigate('/settings') : setShowOptions(true)}
            className="text-black active:opacity-60 transition-opacity"
          >
            {isOwnProfile ? <BiMenu size={28} /> : <BiDotsVerticalRounded size={28} />}
          </button>
        </div>
      </div>

      <div className="scrollable flex-1">
        {/* Profile Info */}
        <div className="flex flex-col items-center pt-4 pb-6 px-4">
          <div className="relative w-24 h-24 mb-4">
            <div className="w-full h-full rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-pink-600">
              <div className="w-full h-full rounded-full p-[3px] bg-white">
                <img 
                  src={profile?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUsername}`} 
                  alt="avatar" 
                  className="w-full h-full rounded-full object-cover bg-gray-100" 
                />
              </div>
            </div>
            {isOwnProfile && (
              <div className="absolute right-0 bottom-0 w-7 h-7 bg-[#20D5EC] rounded-full border-[3px] border-white flex items-center justify-center text-white cursor-pointer shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
              </div>
            )}
          </div>
          
          <h1 className="text-[18px] font-bold text-black mb-0.5">{profile?.fullName || displayUsername}</h1>
          <p className="text-[13px] font-medium text-gray-500 mb-5">@{displayUsername}</p>

          {/* Stats Section with Dividers */}
          <div className="flex items-center justify-center w-full mb-6">
            <div className="flex flex-col items-center px-6 cursor-pointer active:opacity-70" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'following' } })}>
              <span className="text-[17px] font-bold text-black">{profile?.stats?.followingCount || 0}</span>
              <span className="text-[12px] text-gray-400">Following</span>
            </div>
            <div className="w-[1px] h-3 bg-gray-200" />
            <div className="flex flex-col items-center px-6 cursor-pointer active:opacity-70" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'followers' } })}>
              <span className="text-[17px] font-bold text-black">{profile?.stats?.followersCount || 0}</span>
              <span className="text-[12px] text-gray-400">Followers</span>
            </div>
            <div className="w-[1px] h-3 bg-gray-200" />
            <div className="flex flex-col items-center px-6">
              <span className="text-[17px] font-bold text-black">{profile?.stats?.likesCount || 0}</span>
              <span className="text-[12px] text-gray-400">Likes</span>
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2 w-full max-w-[340px] mb-6">
              {isBlocked ? (
                <button
                  onClick={handleBlockToggle}
                  className="flex-1 h-[44px] bg-[#FE2C55] text-white text-[15px] font-bold rounded-lg active:scale-95 transition-all shadow-lg shadow-pink-100"
                >
                  Unblock
                </button>
              ) : (
                <>
                  {incomingFollowStatus === 'pending' ? (
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={handleAcceptRequest}
                        className="flex-1 h-[44px] bg-[#FE2C55] text-white text-[15px] font-bold rounded-lg active:scale-95 transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={handleRejectRequest}
                        className="flex-1 h-[44px] bg-gray-100 text-black text-[15px] font-bold rounded-lg border border-gray-200 active:scale-95 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className={`flex-1 h-[44px] rounded-lg text-[15px] font-bold transition-all active:scale-95 ${
                        followStatus === 'accepted' 
                          ? 'bg-gray-100 text-black border border-gray-200'
                          : followStatus === 'pending'
                            ? 'bg-gray-100 text-gray-500 border border-gray-200'
                            : 'bg-[#FE2C55] text-white shadow-lg shadow-pink-100'
                      }`}
                    >
                      {getFollowButtonLabel()}
                    </button>
                  )}
                  <button
                    onClick={handleOpenChat}
                    className="w-[110px] h-[44px] bg-gray-100 text-black text-[15px] font-bold rounded-lg flex items-center justify-center active:scale-95 transition-all"
                  >
                    Message
                  </button>
                  <button
                    onClick={handleToggleSuggested}
                    className="w-[44px] h-[44px] bg-gray-100 rounded-lg flex items-center justify-center text-black active:bg-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                      className={`transition-transform duration-200 ${showSuggested ? 'rotate-180' : ''}`}
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}

          {!showSuggested && (
            <div className="px-6">
               <p className="text-[14px] text-gray-800 text-center leading-relaxed whitespace-pre-line">
                {profile?.bio || 'No bio yet'}
              </p>
            </div>
          )}
        </div>

        {/* Suggested Section */}
        {showSuggested && visibleSuggestions.length > 0 && (
          <div className="px-4 pb-4 animate-fade-in-down">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-gray-400">Suggested accounts</span>
              <span className="text-[13px] font-bold text-gray-900 active:opacity-60 cursor-pointer" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'suggested' } })}>View all</span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-2">
              {visibleSuggestions.map(account => (
                <div
                  key={account.id}
                  className="snap-start flex-none w-[140px] bg-gray-50 rounded-xl p-4 flex flex-col items-center relative border border-gray-100 h-[200px] justify-between"
                  onClick={() => handleSuggestedAccountClick(account)}
                >
                  <button className="absolute top-2 right-2 text-gray-300 active:opacity-100 z-10 p-1" onClick={(e) => { e.stopPropagation(); setRandomSuggestions(prev => prev.filter(c => c.id !== account.id)); }}>
                    <BiX size={20} />
                  </button>
                  <div className="w-[80px] h-[80px] rounded-full overflow-hidden mb-1 mt-1 bg-white border border-gray-100">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account.username}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-full flex flex-col items-center mt-1">
                    <p className="text-black text-[13px] font-bold text-center truncate w-full">{account.name}</p>
                    <p className="text-gray-400 text-[11px] font-medium truncate w-full text-center">Suggested for you</p>
                  </div>
                  <button
                    className="w-full py-2 bg-[#FE2C55] text-white text-[12px] font-bold rounded-lg active:brightness-90 shadow-sm"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs section */}
        <div className="flex border-t border-gray-100 bg-white sticky top-0 z-10">
          {[
            { id: 'videos', icon: <BsGrid3X3 size={20} /> },
            ...(isOwnProfile ? [{ id: 'saves', icon: <BiBookmark size={24} /> }] : []),
            { id: 'likes', icon: <BiHeart size={24} /> }
          ].map(tab => (
            <div
              key={tab.id}
              className={`flex-1 flex justify-center py-3 relative cursor-pointer ${
                activeTab === tab.id ? 'text-black' : 'text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/4 w-1/2 h-[2px] bg-black"></div>
              )}
            </div>
          ))}
        </div>

        {/* Video Grid Section */}
        <div className="grid grid-cols-3 gap-[1px] bg-gray-50">
          {isBlocked ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 gap-2 text-gray-400">
              <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <p className="text-[16px] font-bold text-black mb-0.5">You blocked this user</p>
              <p className="text-[13px] text-gray-400">Unblock to see their content.</p>
            </div>
          ) : isPrivateAndLocked ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 gap-2 text-gray-400">
              <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <p className="text-[16px] font-bold text-black mb-0.5">This account is private</p>
              <p className="text-[13px] text-gray-400">Follow this account to see their videos.</p>
            </div>
          ) : (
            <>
              {activeTab === 'videos' && <VideoGrid videos={userVideos} onVideoClick={handleVideoClick} />}
              {activeTab === 'saves' && isOwnProfile && (
                savedVideos.length > 0 ? (
                  <VideoGrid videos={savedVideos} onVideoClick={handleVideoClick} />
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
                    <BiBookmark size={48} opacity={0.3} />
                    <p className="text-sm">No saved videos yet</p>
                  </div>
                )
              )}
              {activeTab === 'likes' && isOwnProfile && (
                likedVideos.length > 0 ? (
                  <VideoGrid videos={likedVideos} onVideoClick={handleVideoClick} />
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
                    <BiHeart size={48} opacity={0.3} />
                    <p className="text-sm">No liked videos yet</p>
                  </div>
                )
              )}
              {(!isOwnProfile && (activeTab === 'likes' || activeTab === 'saves')) && (
                <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-2 text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <p className="text-sm mt-2">This user's content is private</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ProfileMoreOptionsSheet 
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        profile={profile}
        isBlocked={isBlocked}
        onBlockToggle={handleBlockToggle}
        onReportClick={handleReportUser}
        onShareClick={() => {
          handleShareProfile();
          setShowOptions(false);
        }}
        onMessageClick={() => {
          handleOpenChat();
          setShowOptions(false);
        }}
      />

      {/* Report Sheet for Users */}
      <ReportUserSheet 
        isOpen={showReport} 
        onClose={() => setShowReport(false)} 
        userId={profile?._id}
      />

      {/* Vertical Reel Overlay Player */}
      {activeOverlayIndex !== null && (
        <div className="absolute inset-x-0 top-0 bottom-0 bg-black z-[900] flex flex-col animate-fade-in">
          {/* Top Header */}
          <div className="absolute top-[var(--safe-area-top)] left-0 w-full flex justify-between items-center px-4 py-6 z-[950] pointer-events-none">
            <button 
              onClick={handleCloseOverlay} 
              className="pointer-events-auto flex items-center gap-1 text-white font-bold bg-transparent border-none outline-none cursor-pointer drop-shadow-md active:opacity-60 transition-opacity"
            >
              <BiArrowBack size={26} />
            </button>
            <button 
              onClick={() => {
                handleCloseOverlay();
                navigate('/search');
              }} 
              className="pointer-events-auto text-white bg-transparent border-none outline-none cursor-pointer drop-shadow-md active:opacity-60 transition-opacity"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>

          {/* Vertical Snapping Container */}
          <div
            ref={overlayContainerRef}
            className="h-full w-full overflow-y-auto snap-y snap-mandatory reels-feed-container no-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto', touchAction: 'pan-y' }}
          >
            {overlayVideos.map((video, index) => {
              const isVisible = Math.abs(index - activeOverlayIndex) <= 2;
              return (
                <div
                  key={video._id || video.id}
                  data-index={index}
                  className="overlay-video-card-wrapper h-full w-full snap-start snap-always relative"
                  style={{ scrollSnapStop: 'always' }}
                >
                  {isVisible ? (
                    <VideoCard
                      videoData={video}
                      isActive={index === activeOverlayIndex}
                    />
                  ) : (
                    <div className="h-full w-full bg-black flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-white/10 border-t-white/30 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
