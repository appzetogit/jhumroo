import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BiMenu, BiUserPlus, BiBookmark, BiHeart, BiArrowBack, BiBell, BiDotsVerticalRounded, BiX, BiChevronDown } from 'react-icons/bi';
import { BsGrid3X3 } from 'react-icons/bs';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import userService from '../../../../services/userService';
import followService from '../../../../services/followService';
import ProfileMoreOptionsSheet from '../../components/modals/ProfileMoreOptionsSheet';
import ReportSheet from '../../components/modals/ReportSheet';
import ReportUserSheet from '../../components/modals/ReportUserSheet';
import PhotoPickerSheet from '../../components/modals/PhotoPickerSheet';
import VideoCard from '../../components/video/VideoCard';

const LazyVideo = ({ src, className }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const setShouldLoadRef = useRef(setShouldLoad);
  setShouldLoadRef.current = setShouldLoad;

  useEffect(() => {
    setHasError(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadRef.current(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [src]);

  if (hasError || !src) {
    return <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white/20 text-xs">Unavailable</div>;
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-950">
      {shouldLoad ? (
        <video 
          src={src} 
          preload="metadata"
          muted
          playsInline
          className={className}
          onError={(e) => {
            e.stopPropagation();
            setHasError(true);
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-900 animate-pulse" />
      )}
    </div>
  );
};

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
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <LazyVideo 
                src={video.video?.url || video.url} 
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
  const location = useLocation();
  const { user: currentUser, updateUser } = useAuth();
  const { showToast } = useToast();
  const { config } = useAppContent();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'videos';
  });
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
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
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  const [overlayVideos, setOverlayVideos] = useState([]);
  const [activeOverlayIndex, setActiveOverlayIndex] = useState(null);
  const [justOpenedOverlay, setJustOpenedOverlay] = useState(false);
  const overlayContainerRef = useRef(null);

  const displayUsername = profileUsername || currentUser?.username || 'user';
  const isOwnProfile = !profileUsername || 
    (profileUsername && currentUser?.username && profileUsername.toLowerCase() === currentUser.username.toLowerCase());
  const activeProfile = profile || (isOwnProfile ? currentUser : null);
  const isPrivateAndLocked = !isOwnProfile && profile?.isPrivate && !isFollowing;

  useEffect(() => {
    if (!isOwnProfile) {
      setProfile(null);
      setUserVideos([]);
      setIsFollowing(false);
      setFollowStatus(null);
      setIsFollower(false);
      setIsBlocked(false);
      setIsBlockedByThem(false);
    }
    fetchProfileData();
  }, [displayUsername, isOwnProfile]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'saves' || activeTab === 'likes') {
      fetchEngagementData();
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      if (activeOverlayIndex !== null) {
        setUserVideos(prev => [...prev]);
        setLikedVideos(prev => [...prev]);
        setSavedVideos(prev => [...prev]);
        setActiveOverlayIndex(null);
        setOverlayVideos([]);
        document.body.removeAttribute('data-reel-overlay-open');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeOverlayIndex]);

  useEffect(() => {
    const handleReelReported = (e) => {
      const { reelId } = e.detail;
      setUserVideos(prev => prev.filter(r => (r._id || r.id) !== reelId));
      setLikedVideos(prev => prev.filter(r => (r._id || r.id) !== reelId));
      setSavedVideos(prev => prev.filter(r => (r._id || r.id) !== reelId));
      setOverlayVideos(prev => prev.filter(r => (r._id || r.id) !== reelId));
    };
    window.addEventListener('reel-reported', handleReelReported);
    return () => window.removeEventListener('reel-reported', handleReelReported);
  }, []);

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
      // Fetch profile data and reels in parallel for optimal load speed
      const [profileRes, reelsRes] = await Promise.all([
        userService.getUserByUsername(displayUsername),
        userService.getUserReels(displayUsername)
      ]);

      if (profileRes.success) {
        setProfile(profileRes.user);
        setIsFollowing(profileRes.user.isFollowing);
        setFollowStatus(profileRes.user.followStatus);
        setIsFollower(profileRes.user.isFollower);
        setIncomingFollowStatus(profileRes.user.incomingFollowStatus);
        setIsBlocked(currentUser?.blockedUsers?.includes(profileRes.user._id));
        setIsBlockedByThem(profileRes.user.isBlockedByThem || false);

        if (isOwnProfile && updateUser) {
          updateUser({
            ...currentUser,
            ...profileRes.user
          });
        }

        if (!profileRes.user.isBlockedByThem && reelsRes.success) {
          setUserVideos(reelsRes.reels);
        } else {
          setUserVideos([]);
        }
      }

      if (isOwnProfile) {
        // Fetch engagement data and requests count in parallel as well
        const [pendingRes, likedRes, savedRes] = await Promise.all([
          followService.getFollowRequestsCount(),
          userService.getLikedReels(),
          userService.getSavedReels()
        ]);

        if (pendingRes.success) {
          setPendingRequestsCount(pendingRes.count);
        }
        if (likedRes.success) {
          setLikedVideos(likedRes.reels);
        }
        if (savedRes.success) {
          setSavedVideos(savedRes.reels);
        }
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
        if (likedVideos.length > 0) return; // Skip if already loaded
        const likedRes = await userService.getLikedReels();
        if (likedRes.success) setLikedVideos(likedRes.reels);
      } else if (activeTab === 'saves') {
        if (savedVideos.length > 0) return; // Skip if already loaded
        const savedRes = await userService.getSavedReels();
        if (savedRes.success) setSavedVideos(savedRes.reels);
      } else {
        const promises = [];
        if (likedVideos.length === 0) promises.push(userService.getLikedReels());
        else promises.push(Promise.resolve(null));

        if (savedVideos.length === 0) promises.push(userService.getSavedReels());
        else promises.push(Promise.resolve(null));

        const [likedRes, savedRes] = await Promise.all(promises);
        if (likedRes && likedRes.success) setLikedVideos(likedRes.reels);
        if (savedRes && savedRes.success) setSavedVideos(savedRes.reels);
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
    setUserVideos(prev => [...prev]);
    setLikedVideos(prev => [...prev]);
    setSavedVideos(prev => [...prev]);
    setActiveOverlayIndex(null);
    setOverlayVideos([]);
    document.body.removeAttribute('data-reel-overlay-open');
    if (window.history.state?.overlayOpen) {
      window.history.back();
    }
  };

  useEffect(() => {
    const handleCloseOverlayEvent = () => {
      handleCloseOverlay();
    };
    window.addEventListener('close-reel-overlay', handleCloseOverlayEvent);
    return () => window.removeEventListener('close-reel-overlay', handleCloseOverlayEvent);
  }, [handleCloseOverlay]);

  const handleShareProfile = async () => {
    const shareData = {
      title: `${activeProfile?.fullName || displayUsername}'s Profile`,
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
          window.dispatchEvent(new CustomEvent('user-blocked', { detail: { userId: profile._id } }));
        }
        setShowOptions(false);
      }
    } catch (error) {
      console.error('Block action failed:', error);
    }
  };

  const handleFileSelected = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const response = await userService.uploadProfilePicture(formData);
      if (response.success) {
        setProfile(prev => ({
          ...prev,
          profilePicture: response.profilePicture
        }));
        
        const updatedUser = {
          ...currentUser,
          profilePicture: response.profilePicture,
        };
        updateUser(updatedUser);
        showToast('Profile photo saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      showToast('Profile photo upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleReportUser = () => {
    setShowOptions(false);
    setShowReport(true);
  };

  if (loading && !profile && !isOwnProfile) {
    return (
      <div className="page-container theme-surface-page flex flex-col">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 sticky top-0 z-[60] bg-[color:var(--theme-page-bg)]/90 backdrop-blur-md">
          <button onClick={() => navigate(-1)} className="text-white active:opacity-60">
            <BiArrowBack size={26} />
          </button>
          <div className="flex-1" />
          <div className="w-6" />
        </div>

        {/* Skeleton Profile Info */}
        <div className="scrollable flex-1">
          <div className="flex flex-col items-center pt-4 pb-6 px-4">
            {/* Avatar Skeleton */}
            <div className="w-24 h-24 mb-4 rounded-full bg-white/10 animate-pulse" />
            
            {/* Name Skeleton */}
            <div className="w-32 h-5 bg-white/10 rounded-md mb-2 animate-pulse" />
            <div className="w-20 h-3.5 bg-white/5 rounded-md mb-5 animate-pulse" />

            {/* Stats Skeleton */}
            <div className="flex items-center justify-center w-full mb-6 gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-5 bg-white/10 rounded animate-pulse" />
                <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-5 bg-white/10 rounded animate-pulse" />
                <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-5 bg-white/10 rounded animate-pulse" />
                <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
              </div>
            </div>

            {/* Buttons Skeleton */}
            <div className="flex items-center gap-2 w-full max-w-[340px] mb-6">
              <div className="flex-1 h-[44px] bg-white/10 rounded-lg animate-pulse" />
              <div className="flex-1 h-[44px] bg-white/5 rounded-lg animate-pulse" />
            </div>

            {/* Video Grid Skeleton */}
            <div className="w-full grid grid-cols-3 gap-0.5 pt-2">
              <div className="aspect-[3/4] bg-white/5 animate-pulse" />
              <div className="aspect-[3/4] bg-white/5 animate-pulse" />
              <div className="aspect-[3/4] bg-white/5 animate-pulse" />
              <div className="aspect-[3/4] bg-white/5 animate-pulse" />
              <div className="aspect-[3/4] bg-white/5 animate-pulse" />
              <div className="aspect-[3/4] bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-container ${isOwnProfile ? '' : 'pb-0'} theme-surface-page flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 sticky top-0 z-[60] bg-[color:var(--theme-page-bg)]/90 backdrop-blur-md">
        {isOwnProfile ? (
          <button onClick={() => navigate('/user/requests')} className="theme-text-primary active:opacity-60 relative">
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
          <button 
            onClick={() => {
              if (showOptions) {
                setShowOptions(false);
              } else if (showReport) {
                setShowReport(false);
              } else if (showPhotoPicker) {
                setShowPhotoPicker(false);
              } else {
                navigate(-1);
              }
            }} 
            className="theme-text-primary active:opacity-60"
          >
            <BiArrowBack size={26} />
          </button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button 
            onClick={handleShareProfile}
            className="theme-text-primary active:opacity-60 transition-opacity"
            title="Share Profile"
          >
            <svg 
              width="24" height="24" 
              viewBox="0 0 48 48" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M43.2 22.1L27.6 7.3c-1.2-1.1-3.1-.3-3.1 1.4v7.1C13.2 16.7 6 24 6 36.3c0 2.2.3 4.3 1 6.3.3.9 1.5 1.1 2.1.4 4.8-5.8 11.5-8.5 15.4-8.8v6.8c0 1.7 1.9 2.5 3.1 1.4l15.6-14.8c.8-.8.8-2 0-2.7z"/>
            </svg>
          </button>
          {!isOwnProfile && isBlockedByThem ? null : (
            <button 
              onClick={() => isOwnProfile ? navigate('/settings') : setShowOptions(true)}
              className="theme-text-primary active:opacity-60 transition-opacity"
            >
              {isOwnProfile ? <BiMenu size={28} /> : <BiDotsVerticalRounded size={28} />}
            </button>
          )}
        </div>
      </div>

      <div className="scrollable flex-1">
        {/* Profile Info */}
        <div className="flex flex-col items-center pt-4 pb-6 px-4">
          <div className="relative w-24 h-24 mb-4">
            <div className="w-full h-full rounded-full p-[2px] bg-white">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#242424]">
                <img 
                  src={activeProfile?.profilePicture?.url || (typeof activeProfile?.profilePicture === 'string' ? activeProfile?.profilePicture : null) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayUsername}`} 
                  alt="avatar" 
                  className="w-full h-full rounded-full object-cover" 
                />
              </div>
            </div>
            {isOwnProfile && (
              <div 
                onClick={() => setShowPhotoPicker(true)}
                className="absolute right-0 bottom-0 w-7 h-7 bg-white rounded-full p-[2.5px] flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-transform"
              >
                <div className="w-full h-full bg-[#00D2E5] rounded-full flex items-center justify-center text-white">
                  {uploading ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Name + Edit Pill */}
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <h1 className="text-[15px] font-bold text-white">
              {activeProfile?.fullName || displayUsername}
            </h1>
            {isOwnProfile && (
              <button 
                onClick={() => navigate('/settings/edit-profile')}
                className="px-3.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-black text-[13px] font-semibold rounded-full active:scale-95 transition-all ml-1"
              >
                Edit
              </button>
            )}
          </div>

          {/* Username Handle */}
          <p className="text-[12px] font-normal text-white/50 mb-4">@{displayUsername}</p>

          {/* Stats Section with Dividers (Matching TikTok screenshot) */}
          <div className="flex items-center justify-center w-full mb-3">
            <div className="flex flex-col items-center px-4 cursor-pointer active:opacity-70" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'following' } })}>
              <span className="text-[17px] font-bold text-white">{activeProfile?.stats?.followingCount ?? activeProfile?.followingCount ?? 0}</span>
              <span className="text-[12px] text-white/40 font-normal mt-0.5">Following</span>
            </div>
            <div className="w-[1px] h-3.5 bg-white/15" />
            <div className="flex flex-col items-center px-4 cursor-pointer active:opacity-70" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'followers' } })}>
              <span className="text-[17px] font-bold text-white">{activeProfile?.stats?.followersCount ?? activeProfile?.followersCount ?? 0}</span>
              <span className="text-[12px] text-white/40 font-normal mt-0.5">Followers</span>
            </div>
            <div className="w-[1px] h-3.5 bg-white/15" />
            <div className="flex flex-col items-center px-4">
              <span className="text-[17px] font-bold text-white">{activeProfile?.stats?.likesCount ?? activeProfile?.likesCount ?? 0}</span>
              <span className="text-[12px] text-white/40 font-normal mt-0.5">Likes</span>
            </div>
          </div>

          {/* Bio text below stats (Matching TikTok screenshot) */}
          {(activeProfile?.bio || activeProfile?.description) && (
            <p className="text-[13px] text-white/80 font-normal mt-1 mb-4 text-center px-6 max-w-sm leading-snug">
              {activeProfile?.bio || activeProfile?.description}
            </p>
          )}

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2 w-full max-w-[340px] mb-6">
              {isBlockedByThem ? (
                <button
                  disabled
                  className="flex-1 h-[44px] bg-white/5 text-white/40 text-[15px] font-bold rounded-lg cursor-not-allowed border border-white/5"
                >
                  Profile Unavailable
                </button>
              ) : isBlocked ? (
                <button
                  onClick={handleBlockToggle}
                  className="flex-1 h-[44px] bg-[#FE2C55] text-white text-[15px] font-bold rounded-lg active:scale-95 transition-all shadow-none"
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
                        className="flex-1 h-[44px] bg-white/10 text-white text-[15px] font-bold rounded-lg border border-white/10 active:scale-95 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className={`flex-1 h-[44px] rounded-lg text-[15px] font-bold transition-all active:scale-95 ${
                        followStatus === 'accepted' 
                          ? 'bg-white/10 text-white border border-white/10'
                          : followStatus === 'pending'
                            ? 'bg-white/10 text-white/50 border border-white/10'
                            : 'bg-[#FE2C55] text-white shadow-none'
                      }`}
                    >
                      {getFollowButtonLabel()}
                    </button>
                  )}
                  <button
                    onClick={handleOpenChat}
                    className="w-[110px] h-[44px] bg-white/10 text-white text-[15px] font-bold rounded-lg flex items-center justify-center active:scale-95 transition-all"
                  >
                    Message
                  </button>
                  <button
                    onClick={handleToggleSuggested}
                    className="w-[44px] h-[44px] bg-white/10 rounded-lg flex items-center justify-center text-white active:bg-white/20 transition-colors"
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


        </div>

        {/* Suggested Section */}
        {showSuggested && visibleSuggestions.length > 0 && (
          <div className="px-4 pb-4 animate-fade-in-down">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-white/40">Suggested accounts</span>
              <span className="text-[13px] font-bold text-[#FE2C55] active:opacity-60 cursor-pointer" onClick={() => navigate(`/user/${displayUsername}/followers`, { state: { activeTab: 'suggested' } })}>View all</span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-2">
              {visibleSuggestions.map(account => (
                <div
                  key={account.id}
                  className="snap-start flex-none w-[140px] bg-[#242424] rounded-xl p-4 flex flex-col items-center relative border border-white/5 h-[200px] justify-between"
                  onClick={() => handleSuggestedAccountClick(account)}
                >
                  <button className="absolute top-2 right-2 text-white/30 active:opacity-100 z-10 p-1" onClick={(e) => { e.stopPropagation(); setRandomSuggestions(prev => prev.filter(c => c.id !== account.id)); }}>
                    <BiX size={20} />
                  </button>
                  <div className="w-[80px] h-[80px] rounded-full overflow-hidden mb-1 mt-1 bg-[#161616] border border-white/5">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${account.username}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-full flex flex-col items-center mt-1">
                    <p className="text-white text-[13px] font-bold text-center truncate w-full">{account.name}</p>
                    <p className="text-white/40 text-[11px] font-medium truncate w-full text-center">Suggested for you</p>
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
        <div className="flex border-t border-white/5 bg-[#161616] sticky top-0 z-10">
          {[
            { id: 'videos', icon: <BsGrid3X3 size={20} /> },
            ...(isOwnProfile ? [
              { id: 'saves', icon: <BiBookmark size={24} /> }
            ] : []),
            { id: 'likes', icon: <BiHeart size={24} /> }
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
                <div className="absolute bottom-0 left-1/4 w-1/2 h-[2px] bg-white"></div>
              )}
            </div>
          ))}
        </div>

        {/* Video Grid Section */}
        <div className="grid grid-cols-3 gap-[1px] bg-[#161616]">
          {isBlockedByThem ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 gap-2 text-white/40">
              <div className="w-16 h-16 rounded-full border-2 border-white/5 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <p className="text-[16px] font-bold text-white mb-0.5">This profile is unavailable</p>
              <p className="text-[13px] text-white/40">You can no longer view their content.</p>
            </div>
          ) : isBlocked ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 gap-2 text-white/40">
              <div className="w-16 h-16 rounded-full border-2 border-white/5 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <p className="text-[16px] font-bold text-white mb-0.5">You blocked this user</p>
              <p className="text-[13px] text-white/40">Unblock to see their content.</p>
            </div>
          ) : isPrivateAndLocked ? (
            <div className="col-span-3 flex flex-col items-center justify-center py-24 gap-2 text-white/40">
              <div className="w-16 h-16 rounded-full border-2 border-white/5 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <p className="text-[16px] font-bold text-white mb-0.5">This account is private</p>
              <p className="text-[13px] text-white/40">Follow this account to see their videos.</p>
            </div>
          ) : (
            <>
              {activeTab === 'videos' && <VideoGrid videos={userVideos} onVideoClick={handleVideoClick} />}
              {activeTab === 'saves' && isOwnProfile && (
                savedVideos.length > 0 ? (
                  <VideoGrid videos={savedVideos} onVideoClick={handleVideoClick} />
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-white/30">
                    <BiBookmark size={48} className="text-white/30" />
                    <p className="text-sm">No saved videos yet</p>
                  </div>
                )
              )}
              {activeTab === 'likes' && isOwnProfile && (
                likedVideos.length > 0 ? (
                  <VideoGrid videos={likedVideos} onVideoClick={handleVideoClick} />
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 text-white/30">
                    <BiHeart size={48} className="text-white/30" />
                    <p className="text-sm">No liked videos yet</p>
                  </div>
                )
              )}
              {(!isOwnProfile && (activeTab === 'likes' || activeTab === 'saves')) && (
                <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-2 text-white/30">
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

      {/* Photo Picker Bottom Sheet */}
      <PhotoPickerSheet
        isOpen={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        onFileSelected={handleFileSelected}
        hasExistingPhoto={!!currentUser?.profilePicture?.url}
      />

      {/* Vertical Reel Overlay Player */}
      {activeOverlayIndex !== null && (
        <div className="fixed inset-x-0 top-0 bg-black z-[999] flex flex-col animate-fade-in" style={{ bottom: 'var(--bottom-nav-height)' }}>
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
                      preload={index === activeOverlayIndex ? "auto" : (index === activeOverlayIndex + 1 ? "auto" : "none")}
                      compactBottom={true}
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
