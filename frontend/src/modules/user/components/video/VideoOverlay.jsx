import React, { useState, useEffect, useCallback } from 'react';
import { BiPlus, BiVolumeFull, BiVolumeMute } from 'react-icons/bi';
import { IoIosMusicalNote } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import CommentsSheet from '../modals/CommentsSheet';
import MoreOptionsSheet from '../modals/MoreOptionsSheet';
import ReportSheet from '../modals/ReportSheet';
import EditReelSheet from '../modals/EditReelSheet';
import FullscreenPlayer from '../modals/FullscreenPlayer';
import LikesSheet from '../modals/LikesSheet';
import CaptionRenderer from './CaptionRenderer';
import reelService from '../../../../services/reelService';
import userService from '../../../../services/userService';
import messageService from '../../../../services/messageService';
import adService from '../../../../services/adService';
import followService from '../../../../services/followService';
import { useAuth } from '../../../../context/AuthContext';

// In-app toast helper — shows a brief floating message
const showOverlayToast = (message) => {
  const existing = document.getElementById('overlay-share-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'overlay-share-toast';
  el.textContent = message;
  el.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:rgba(30,30,30,0.92);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:600;z-index:99999;pointer-events:none;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.4);transition:opacity 0.3s';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
};

// Helper to format numbers like TikTok (e.g. 5M, 48K, 0, 1)
const formatTikTokCount = (num) => {
  if (num === undefined || num === null || num === '') return '0';
  if (typeof num === 'string') return num;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// Helper to format seconds into mm:ss (e.g. 00:08, 00:38)
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const VideoSeekBar = ({ currentTime = 0, duration = 0, onSeek, onScrubStateChange, compactBottom = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressBarRef = React.useRef(null);

  const calculateTimeFromEvent = (e) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    return percentage * duration;
  };

  const handleStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    if (typeof onScrubStateChange === 'function') onScrubStateChange(true);
    const newTime = calculateTimeFromEvent(e);
    setDragTime(newTime);
    if (typeof onSeek === 'function') onSeek(newTime);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      e.stopPropagation();
      const newTime = calculateTimeFromEvent(e);
      setDragTime(newTime);
      if (typeof onSeek === 'function') onSeek(newTime);
    };

    const handleEnd = (e) => {
      e.stopPropagation();
      setIsDragging(false);
      if (typeof onScrubStateChange === 'function') onScrubStateChange(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, duration, onSeek, onScrubStateChange]);

  const displayTime = isDragging ? dragTime : currentTime;
  const effectiveDuration = duration > 0 ? duration : 1;
  const progressPercent = Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100));

  return (
    <div className={`absolute left-0 w-full z-[100] ${compactBottom ? 'bottom-0' : 'bottom-[calc(var(--bottom-nav-height,45px)+env(safe-area-inset-bottom,0px))]'}`}>
      {/* Big Scrub Time Overlay (Matching Image 2: Floating text in clean empty space, no box!) */}
      {isDragging && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[110] flex items-center justify-center pointer-events-none select-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
          <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-wider">
            {formatTime(displayTime)}
          </span>
          <span className="text-3xl sm:text-4xl font-light text-white/40 tracking-wider mx-3">
            /
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold text-white/40 tracking-wider">
            {formatTime(effectiveDuration)}
          </span>
        </div>
      )}

      {/* Bottom Seek Bar (Matching Image 1 & Image 2) */}
      <div 
        ref={progressBarRef}
        className="w-full relative h-4 flex items-center cursor-pointer group pointer-events-auto touch-none select-none px-0"
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        {/* Track Line */}
        <div className={`w-full relative transition-all duration-150 bg-white/20 rounded-full overflow-hidden ${isDragging ? 'h-[5px]' : 'h-[1.5px] group-hover:h-[4px]'}`}>
          {/* Progress Fill */}
          <div 
            className="h-full bg-white rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Thumb Handle (Matching Image 1 & Image 2) */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-2 bg-white rounded-full shadow-[0_0_6px_rgba(0,0,0,0.8)] transition-all duration-100 -ml-1.75 ${isDragging ? 'scale-125 opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:scale-110'}`}
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

const VideoOverlay = ({ reelId, username, caption, musicName, isLiked, likes, comments, shares, saves, isSaved, onSaveClick, onLikeClick, videoData, onUpdate, isMuted, onMuteToggle, isPlaying, compactBottom = false, currentTime = 0, duration = 0, onSeek, onScrubStateChange }) => {
  const isAd = videoData.isAd;
  const isAdminAd = isAd && videoData.onModel === 'Admin';

  const { user: currentUser } = useAuth();
  const creatorId = videoData.user?._id || videoData.user;
  const isOwnReel = currentUser && creatorId && (currentUser._id === creatorId || currentUser.username === username);

  const [followingState, setFollowingState] = useState(() => {
    if (isOwnReel || isAd) return 'none';
    return videoData.user?.isFollowing ? 'following' : 'not_following';
  });

  useEffect(() => {
    if (isOwnReel || isAd) {
      setFollowingState('none');
    } else {
      setFollowingState(videoData.user?.isFollowing ? 'following' : 'not_following');
    }
  }, [videoData, isOwnReel, isAd]);

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Please log in to follow creators.');
      return;
    }
    if (!creatorId) return;

    try {
      if (followingState === 'following') {
        const res = await followService.unfollowUser(creatorId);
        if (res.success) {
          setFollowingState('not_following');
          if (videoData.user) {
            videoData.user.isFollowing = false;
          }
        }
      } else {
        const res = await followService.followUser(creatorId);
        if (res.success) {
          const newStatus = res.status || 'accepted';
          setFollowingState(newStatus === 'accepted' ? 'following' : 'pending');
          if (videoData.user) {
            videoData.user.isFollowing = newStatus === 'accepted';
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };
  
  const handleAdClick = async () => {
    let targetUrl = videoData.link;
    
    if (videoData.adType === 'chat') {
      const phone = videoData.whatsappNumber?.replace(/\D/g, '');
      const text = encodeURIComponent(videoData.welcomeMessage || 'Hello!');
      targetUrl = `https://wa.me/${phone}?text=${text}`;
    }

    if (targetUrl) {
      // Ensure absolute URL
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        await adService.trackClick(videoData._id);
        window.open(targetUrl, '_blank');
      } catch (err) {
        console.error("Error tracking ad click:", err);
        window.open(targetUrl, '_blank');
      }
    }
  };

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  
  const navigate = useNavigate();

  const handleNotInterested = async () => {
    try {
      await userService.markNotInterested({ 
        reelId, 
        creatorId: videoData.user?._id || videoData.user,
        topics: videoData.hashtags || []
      });
      alert("We'll show you less content like this.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleInterested = async () => {
    try {
      await userService.markInterested(videoData.hashtags || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await reelService.deleteReel(reelId);
      // Refresh feed or remove from UI
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const lastShareTimeRef = React.useRef(0);

  const handleShare = async (platform = 'general', targetUserId = null) => {
    const now = Date.now();
    if (now - lastShareTimeRef.current < 1000) return;
    lastShareTimeRef.current = now;

    const shareUrl = `${window.location.origin}/reel/${reelId}`;
    const shareText = caption || 'Watch this amazing reel on Jhumroo!';
    
    try {
      let shared = false;
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
        shared = true;
      } else if (platform === 'instagram') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showOverlayToast('Link copied! Open Instagram to share.');
          shared = true;
        } catch {
          showOverlayToast('Could not copy link automatically.');
        }
        window.open('https://instagram.com', '_blank');
      } else if (platform === 'messenger') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showOverlayToast('Link copied! Open Messenger to share.');
          shared = true;
        } catch {
          showOverlayToast('Could not copy link automatically.');
        }
      } else if (platform === 'copy') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showOverlayToast('Link copied to clipboard!');
          shared = true;
        } catch {
          showOverlayToast('Could not copy link.');
        }
      } else if (platform === 'general') {
        if (navigator.share) {
          try {
            await navigator.share({ title: 'Jhumroo', text: shareText, url: shareUrl });
            shared = true;
          } catch (shareErr) {
            const isCancel = shareErr.name === 'AbortError' || 
                             shareErr.name === 'NotAllowedError' || 
                             (shareErr.message && shareErr.message.toLowerCase().includes('cancel'));
            if (isCancel) {
              return;
            }
            try {
              await navigator.clipboard.writeText(shareUrl);
              showOverlayToast('Link copied to clipboard!');
              shared = true;
            } catch {
              showOverlayToast('Could not copy link.');
            }
          }
        } else {
          // No Web Share API on this device: copying a link isn't a confirmed
          // send, so don't count it as a share (ponytail: no reliable signal
          // here without a share-to-user picker).
          try {
            await navigator.clipboard.writeText(shareUrl);
            showOverlayToast('Link copied to clipboard!');
          } catch {
            showOverlayToast('Could not copy link.');
          }
        }
      } else if (platform === 'chat' && targetUserId) {
        await messageService.sendMessage({
          receiverId: targetUserId,
          messageType: 'reel',
          reelId: reelId
        });
        shared = true;
      }

      if (shared) {
        const newSharesCount = (shares || 0) + 1;
        if (typeof onUpdate === 'function') {
          onUpdate({ stats: { ...(videoData.stats || {}), sharesCount: newSharesCount } });
        }
        await reelService.shareReel(reelId);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const [animateLike, setAnimateLike] = useState(false);
  const [animateSave, setAnimateSave] = useState(false);

  const handleLikeAnimate = (e) => {
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 500);
    if (typeof onLikeClick === 'function') onLikeClick(e);
  };

  const handleSaveAnimate = (e) => {
    setAnimateSave(true);
    setTimeout(() => setAnimateSave(false), 500);
    if (typeof onSaveClick === 'function') onSaveClick(e);
  };

  const [isScrubbingInternal, setIsScrubbingInternal] = useState(false);

  const handleScrubStateChangeInternal = (scrubbing) => {
    setIsScrubbingInternal(scrubbing);
    if (typeof onScrubStateChange === 'function') onScrubStateChange(scrubbing);
  };

  const isImageAdInternal = isAd && (videoData?.video?.type === 'image' || videoData?.media?.type === 'image');
  const videoUrl = videoData?.video?.url || videoData?.url || videoData?.rawVideoUrl;
  const isPhotoMedia = Boolean(
    isImageAdInternal ||
    videoData?.video?.type === 'image' ||
    videoData?.mediaType === 'photo' ||
    videoData?.isPhoto ||
    (videoUrl && (videoUrl.match(/\.(jpeg|jpg|png|webp)($|\?)/i) || videoUrl.includes('photo')))
  );

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (isNaN(seconds) || seconds < 0) return '';
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const timeAgo = getTimeAgo(videoData?.createdAt);

  return (
    <>
      <div data-video-overlay="true" className="video-overlay absolute inset-0 pointer-events-none flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[30]">
        <div className={`flex justify-between items-end p-4 transition-opacity duration-200 ${isScrubbingInternal ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${compactBottom ? 'pb-4' : 'pb-[calc(var(--bottom-nav-height)+16px+env(safe-area-inset-bottom,0px))]'}`}>
          {/* Left: User info */}
          <div className="flex-1 pr-10 text-left text-white pointer-events-none flex flex-col items-start select-none">
            {/* Ad Action Button - Moved above name */}
            {isAd && (videoData.adType === 'chat' || videoData.link) && (
              <button 
                onClick={handleAdClick}
                className="w-full bg-[#FE2C55] text-white py-3 px-4 rounded-xl font-bold text-[15px] mb-4 active:scale-[0.98] transition-all flex items-center justify-between shadow-lg shadow-[#FE2C55]/20 pointer-events-auto"
              >
                <span className="flex items-center gap-2">
                  {videoData.adType === 'chat' ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  ) : null}
                  {videoData.adType === 'chat' ? 'Chat Now' : 'Shop Now'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            )}

            {/* Username — clickable → user profile */}
            <div className="flex items-center gap-2 mb-1 flex-nowrap max-w-full whitespace-nowrap overflow-hidden">
              {(!isAd || (isAd && videoData.onModel === 'User')) && (
                <h3
                  className="text-[17px] font-bold cursor-pointer active:opacity-70 pointer-events-auto text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tracking-wide truncate shrink min-w-0"
                  onClick={() => navigate(`/user/${username}`)}
                >
                  @{username}
                </h3>
              )}
              {isPhotoMedia && (
                <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
                  <span className="bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-[7px] text-[13px] font-bold text-white flex items-center gap-1.5 border border-white/10 drop-shadow-sm">
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" className="shrink-0">
                      <rect x="5.5" y="5.5" width="10" height="10" rx="3" fill="#FFFFFF" fillOpacity="0.55" />
                      <rect x="2.5" y="2.5" width="10" height="10" rx="3" fill="#FFFFFF" />
                    </svg>
                    <span>Photo</span>
                  </span>
                  {timeAgo && (
                    <span className="text-[13px] text-white/80 font-normal drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      · {timeAgo}
                    </span>
                  )}
                </div>
              )}
              {isAd && (
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Sponsored
                </span>
              )}
              {videoData.isRemix && videoData.originalReel && (
                <span className="bg-[#FE2C55] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pointer-events-auto">
                  Duet
                </span>
              )}
            </div>



            {/* Caption */}
            <div className="text-[14px] leading-snug text-white font-normal drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {isExpanded ? (
                <CaptionRenderer text={caption} className="pointer-events-auto" />
              ) : (
                <>
                  <CaptionRenderer
                    text={caption.length > 85 ? caption.slice(0, 85) : caption}
                  />
                  {caption.length > 85 && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                      }}
                      className="font-bold text-white/90 cursor-pointer ml-1 pointer-events-auto hover:underline"
                    >
                      ...more
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Views Count for Photo Posts */}
            {isPhotoMedia && (
              <div className="mt-2.5 flex items-center gap-1.5 text-white/90 font-medium text-[13px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] pointer-events-auto">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>{formatTikTokCount(videoData?.stats?.viewsCount ?? videoData?.views ?? videoData?.viewsCount ?? 0)} views</span>
              </div>
            )}
          </div>

          {/* Right: Floating TikTok Action Sidebar */}
          <div className="flex flex-col items-center gap-3.5 pointer-events-auto select-none">
             {/* Avatar + Follow Badge Button */}
             {(!isAd || (isAd && videoData.onModel === 'User')) && (
               <div className="relative mb-2">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white bg-surface overflow-hidden cursor-pointer shadow-lg active:scale-95 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentPath = window.location.pathname.toLowerCase();
                      const targetPath = `/user/${username}`.toLowerCase();
                      const isOwnProfilePath = currentPath === '/profile';
                      const isSelfProfile = isOwnProfilePath && currentUser && (currentUser.username?.toLowerCase() === username.toLowerCase());
                      
                      if (currentPath === targetPath || isSelfProfile || currentPath.includes(username.toLowerCase())) {
                        window.dispatchEvent(new CustomEvent('close-reel-overlay'));
                      } else {
                        navigate(`/user/${username}`);
                      }
                    }}
                    style={{ pointerEvents: 'auto' }}
                  >
                     <img 
                        src={videoData.userProfile || videoData.user?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
                        alt="avatar" 
                        className="w-full h-full object-cover" 
                     />
                  </div>
                  {followingState === 'not_following' && (
                    <div 
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#FE2C55] rounded-full border-2 border-black flex items-center justify-center cursor-pointer active:scale-90 transition-transform shadow-md"
                      onClick={handleFollowToggle}
                      title="Follow"
                    >
                      <BiPlus size={14} color="white" strokeWidth={1} />
                    </div>
                  )}
               </div>
             )}

             {/* 1. Like Heart Icon */}
             <div 
               className="flex flex-col items-center text-white cursor-pointer group" 
               onClick={(e) => {
                 e.stopPropagation();
                 handleLikeAnimate(e);
               }}
               style={{ pointerEvents: 'auto' }}
             >
                <div className="active:scale-75 transition-transform duration-150">
                  <svg 
                    width="37" height="37" viewBox="0 0 48 48" 
                    fill={isLiked ? "#FE2C55" : "rgba(255,255,255,0.95)"} 
                    stroke={isLiked ? "#FE2C55" : "rgba(255,255,255,0.95)"}
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className={`transition-all duration-300 ${animateLike ? 'animate-icon-pop' : ''} ${isLiked ? 'scale-110 drop-shadow-[0_0_10px_rgba(254,44,85,0.7)]' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:scale-105'}`}
                  >
                    <path d="M34 9c-4.2 0-7.9 2.1-10 5.4C21.9 11.1 18.2 9 14 9 7.4 9 2 14.4 2 21c0 11.9 14.8 21.2 21.3 25.1.4.2.9.2 1.3 0C31.2 42.2 46 32.9 46 21c0-6.6-5.4-12-12-12z" />
                  </svg>
                </div>
                <span 
                  className="text-[12px] font-bold mt-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] cursor-pointer hover:text-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLikesOpen(true);
                  }}
                >
                  {formatTikTokCount(likes)}
                </span>
             </div>

             {/* 2. Comment Speech Bubble Icon (with 3 dots) */}
             {videoData.allowComments !== false && (
               <div
                 className="flex flex-col items-center text-white cursor-pointer group"
                 onClick={(e) => {
                   e.stopPropagation();
                   setIsCommentsOpen(true);
                 }}
                 style={{ pointerEvents: 'auto' }}
               >
                  <div className="active:scale-75 transition-transform duration-150">
                    <svg 
                      width="37" height="37" viewBox="0 0 48 48" 
                      fill="rgba(255,255,255,0.95)" 
                      stroke="rgba(255,255,255,0.95)"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:scale-105"
                    >
                      <path d="M24 6C13.5 6 5 13.6 5 23c0 4.3 1.8 8.3 4.8 11.3l-2.4 6.7c-.3.9.6 1.7 1.4 1.3l7.9-3.7c2.3.8 4.7 1.4 7.3 1.4 10.5 0 19-7.6 19-17S34.5 6 24 6zm-10 19c-1.4 0-2.5-1.1-2.5-2.5S12.6 20 14 20s2.5 1.1 2.5 2.5S15.4 25 14 25zm10 0c-1.4 0-2.5-1.1-2.5-2.5S22.6 20 24 20s2.5 1.1 2.5 2.5S25.4 25 24 25zm10 0c-1.4 0-2.5-1.1-2.5-2.5S32.6 20 34 20s2.5 1.1 2.5 2.5S33.4 25 34 25z"/>
                    </svg>
                  </div>
                  <span className="text-[12px] font-bold mt-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatTikTokCount(comments)}</span>
               </div>
             )}

             {/* 3. Bookmark / Favorite Ribbon Icon */}
             <div 
               className="flex flex-col items-center text-white cursor-pointer group" 
               onClick={(e) => { 
                 e.stopPropagation(); 
                 handleSaveAnimate(e);
               }} 
               style={{ pointerEvents: 'auto' }}
             >
                <div className="active:scale-75 transition-transform duration-150">
                  <svg 
                    width="37" height="37" viewBox="0 0 48 48" 
                    fill={isSaved ? "#FACD00" : "rgba(255,255,255,0.95)"} 
                    stroke={isSaved ? "#FACD00" : "rgba(255,255,255,0.95)"}
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className={`transition-all duration-200 ${animateSave ? 'animate-icon-pop' : ''} ${isSaved ? 'drop-shadow-[0_0_8px_rgba(250,205,0,0.6)] scale-105' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:scale-105'}`}
                  >
                    <path d="M12 7c-1.1 0-2 .9-2 2v32c0 .9.9 1.5 1.7 1.1L24 35l12.3 7.1c.8.4 1.7-.2 1.7-1.1V9c0-1.1-.9-2-2-2H12z"/>
                  </svg>
                </div>
                <span className="text-[12px] font-bold mt-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  {formatTikTokCount(saves !== undefined && saves !== null ? saves : (videoData.stats?.bookmarksCount ?? videoData.bookmarksCount ?? 0))}
                </span>
             </div>

             {/* 4. Share Curved Arrow Icon */}
             <div 
               className="flex flex-col items-center text-white cursor-pointer group" 
               onClick={(e) => { e.stopPropagation(); handleShare('general'); }} 
               style={{ pointerEvents: 'auto' }}
             >
                <div className="active:scale-75 transition-transform duration-150">
                  <svg 
                    width="37" height="37" viewBox="0 0 48 48" 
                    fill="rgba(255,255,255,0.95)" 
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:scale-105"
                  >
                    <path d="M43.2 22.1L27.6 7.3c-1.2-1.1-3.1-.3-3.1 1.4v7.1C13.2 16.7 6 24 6 36.3c0 2.2.3 4.3 1 6.3.3.9 1.5 1.1 2.1.4 4.8-5.8 11.5-8.5 15.4-8.8v6.8c0 1.7 1.9 2.5 3.1 1.4l15.6-14.8c.8-.8.8-2 0-2.7z"/>
                  </svg>
                </div>
                <span className="text-[12px] font-bold mt-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatTikTokCount(shares)}</span>
             </div>

             {/* 5. More Options Three Dots Icon */}
             <div 
               className="flex flex-col items-center text-white cursor-pointer group" 
               onClick={(e) => { e.stopPropagation(); setIsMoreOpen(true); }} 
               style={{ pointerEvents: 'auto' }}
               title="More options"
             >
                <div className="active:scale-75 transition-transform duration-150 flex items-center justify-center w-[37px] h-[37px]">
                  <svg 
                    width="32" height="32" viewBox="0 0 24 24" 
                    fill="rgba(255,255,255,0.95)" 
                    className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:scale-105"
                  >
                    <circle cx="12" cy="5" r="2.2" />
                    <circle cx="12" cy="12" r="2.2" />
                    <circle cx="12" cy="19" r="2.2" />
                  </svg>
                </div>
             </div>


              {/* 6. Static Vinyl Disc Sound Icon */}
              <div
                className="mt-1 relative cursor-pointer active:scale-90 transition-transform"
                onClick={() => navigate(`/sound/${encodeURIComponent(musicName?.name || musicName)}`)}
                style={{ pointerEvents: 'auto' }}
              >
                 <div className="w-11 h-11 rounded-full border-[7px] border-[#2F2F2F] bg-[#121212] flex justify-center items-center overflow-hidden shadow-2xl">
                    <img 
                       src={musicName?.thumbnail || musicName?.audioId?.thumbnail || `https://api.dicebear.com/7.x/identicon/svg?seed=${musicName?.name || musicName}`} 
                       alt="music thumbnail" 
                       className="w-5 h-5 rounded-full object-cover" 
                     />
                 </div>
                 <IoIosMusicalNote size={12} className="absolute -top-1 -right-1 text-white opacity-85" />
              </div>

          </div>
        </div>

        {/* Interactive Video Progress Seek Bar for Videos only */}
        {!isAd && !isPhotoMedia && (
          <VideoSeekBar
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            onScrubStateChange={handleScrubStateChangeInternal}
            compactBottom={compactBottom}
          />
        )}
      </div>
      
      {/* Comments Sheet Modal */}
      <CommentsSheet 
         isOpen={isCommentsOpen} 
         onClose={() => setIsCommentsOpen(false)} 
         commentCount={comments}
         reelId={reelId}
         reelOwnerId={videoData.user?._id || videoData.user}
         onCommentAdded={(newCount) => {
           if (typeof onUpdate === 'function') {
             onUpdate({ stats: { commentsCount: newCount } });
           }
         }}
      />

      {/* Likes Sheet Modal */}
      <LikesSheet
         isOpen={isLikesOpen}
         onClose={() => setIsLikesOpen(false)}
         reelId={reelId}
      />

      {/* More Options Sheet */}
      <MoreOptionsSheet 
         isOpen={isMoreOpen}
         onClose={() => setIsMoreOpen(false)}
         reelData={videoData}
         isSaved={isSaved}
         onSaveClick={onSaveClick}
         onShareClick={() => {
           setIsMoreOpen(false);
           handleShare('general');
         }}
         onReportClick={() => {
           setIsMoreOpen(false);
           setIsReportOpen(true);
         }}
         onEditClick={() => {
           setIsMoreOpen(false);
           setIsEditOpen(true);
         }}
         onDeleteClick={handleDelete}
         onNotInterestedClick={handleNotInterested}
         onInterestedClick={handleInterested}
         onFullscreenClick={() => {
           setIsMoreOpen(false);
           setIsFullscreen(true);
         }}
      />

      {/* Report Sheet */}
      <ReportSheet 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reelId={reelId}
      />

      {/* Edit Reel Sheet */}
      <EditReelSheet 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        reelData={videoData}
        onUpdate={onUpdate}
      />

      {/* Fullscreen Player */}
      <FullscreenPlayer 
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        videoUrl={videoData?.video?.url || videoData?.url}
        posterUrl={videoData?.video?.thumbnail || videoData?.poster}
        videoData={videoData}
      />
    </>
  );
};

export default VideoOverlay;
