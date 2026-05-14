import React, { useRef, useState, useEffect } from 'react';
import VideoOverlay from './VideoOverlay';
import AddToFavoritesModal from '../modals/AddToFavoritesModal';
import reelService from '../../../../services/reelService';

const VideoCard = ({ videoData, isActive }) => {
  const [playing, setPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('isReelsMuted') === 'true';
  });
  const [showMuteOverlay, setShowMuteOverlay] = useState(false);
  const [localVideoData, setLocalVideoData] = useState(videoData);

  useEffect(() => {
    // Only update local state if the video ID actually changed to avoid resetting optimistic updates
    const prevId = localVideoData?._id || localVideoData?.id;
    const nextId = videoData?._id || videoData?.id;
    
    if (prevId !== nextId) {
      setLocalVideoData(videoData);
    }
  }, [videoData, localVideoData?._id, localVideoData?.id]);
  


  const reelId = String(localVideoData._id || localVideoData.id || '');
  
  // ─── Interactive States ───
  // These are synced with localVideoData for UI display
  const [isLiked, setIsLiked] = useState(() => !!localVideoData.isLiked);
  const [likesCount, setLikesCount] = useState(() => {
    const stats = localVideoData.stats || {};
    const baseCount = Number(stats.likesCount ?? localVideoData.likes ?? 0);
    // If liked, the count must be at least 1 for display
    return Math.max(isLiked ? 1 : 0, baseCount);
  });
  const [isSaved, setIsSaved] = useState(() => !!localVideoData.isSaved);

  // Sync states whenever localVideoData changes
  useEffect(() => {
    const liked = !!localVideoData.isLiked;
    setIsLiked(liked);
    setIsSaved(!!localVideoData.isSaved);
    const stats = localVideoData.stats || {};
    const baseCount = Number(stats.likesCount ?? localVideoData.likes ?? 0);
    // Safety check: if liked is true, count should be at least 1
    setLikesCount(Math.max(liked ? 1 : 0, baseCount));
  }, [localVideoData]);

  const videoRef = useRef(null);
  const lastTapRef = useRef(0);
  const savedToastTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  // Play/pause logic based on scroll visibility
  useEffect(() => {
    let viewTimer;
    let syncInterval;

    if (isActive) {
      if (videoRef.current) {
        // Start video
        videoRef.current.play().then(() => {
          setPlaying(true);
          // Respect global mute state
          if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = isMuted ? 0 : 1;
          }
          
          // Record view after 3 seconds of active play
          viewTimer = setTimeout(async () => {
             try {
                await reelService.recordView(reelId);
             } catch (err) {
                console.error("Error recording view:", err);
             }
          }, 3000);
        }).catch(err => {
            console.log("Autoplay prevented:", err);
            setPlaying(false);
        });

        // Start music if available via the audio ref (now a JSX element)
        // ONLY if the reel hasn't been processed with merged audio yet
        if (audioRef.current && (localVideoData.music?.url || localVideoData.music?.audioUrl) && localVideoData.status !== 'completed') {
          const audio = audioRef.current;
          
          const startAudio = () => {
            if (!isActive || !audio) return; // Guard against rapid scroll or unmount
            
            try {
              audio.currentTime = localVideoData.music.startTime || 0;
              audio.volume = isMuted ? 0 : 1.0;
              audio.muted = isMuted; // Respect global mute state
              
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise.catch(err => {
                  console.warn("Music playback failed, retrying on user interaction:", err);
                  // Some browsers require a click even if previous interaction happened
                });
              }
            } catch (err) {
              console.error("Error in startAudio:", err);
            }
          };

          if (audio.readyState >= 2) {
            startAudio();
          } else {
            audio.load(); // Force load
            audio.addEventListener('canplay', startAudio, { once: true });
          }
          
          // Sync music with video
          syncInterval = setInterval(() => {
            if (videoRef.current && audio && !videoRef.current.paused) {
              // If video loops (currentTime jumps back), reset audio to startTime
              // Increased threshold to 0.5s for better loop detection
              if (videoRef.current.currentTime < 0.5 && audio.currentTime > (localVideoData.music.startTime || 0) + 1) {
                audio.currentTime = localVideoData.music.startTime || 0;
                if (audio.paused) audio.play().catch(() => {});
              }
            }
          }, 400); // Slightly faster check
        }
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        setPlaying(false);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.muted = true;
      }
    }
    
    // Apply mute state whenever isMuted or isActive changes
    if (isActive && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 1;
    }
    if (isActive && audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = isMuted ? 0 : 1;
    }
    
    return () => {
      if (syncInterval) clearInterval(syncInterval);
      if (viewTimer) clearTimeout(viewTimer);
      
      // Cleanup: explicitly pause and clear on unmount
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.muted = true;
      }
    };
  }, [isActive, reelId, videoData.music, videoData.status, isMuted]);

  const onVideoPress = () => {
    if (playing) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current && localVideoData.status !== 'completed') audioRef.current.pause();
      setPlaying(false);
    } else {
      if (videoRef.current) {
        videoRef.current.play();
        videoRef.current.muted = isMuted;
        videoRef.current.volume = isMuted ? 0 : 1;
      }
      if (audioRef.current && localVideoData.status !== 'completed') {
        audioRef.current.volume = isMuted ? 0 : 1.0;
        audioRef.current.muted = isMuted;
        audioRef.current.play();
      }
      setPlaying(true);
    }
  };

  const handleLikeClick = async () => {
    const wasLiked = isLiked;
    const prevCount = likesCount;
    
    // 1. Optimistic Update
    const nextLiked = !wasLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Update both individual states and localVideoData
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setLocalVideoData(prev => ({
      ...prev,
      isLiked: nextLiked,
      stats: { ...(prev.stats || {}), likesCount: nextCount }
    }));

    // 2. API Call
    try {
      const response = await reelService.toggleLike(reelId);
      if (response?.success) {
        // Update with server truth
        const serverCount = Number(response.likesCount);
        const serverLiked = response.isLiked;
        
        setIsLiked(serverLiked);
        setLikesCount(serverCount);
        setLocalVideoData(prev => ({
          ...prev,
          isLiked: serverLiked,
          stats: { ...(prev.stats || {}), likesCount: serverCount }
        }));
      }
    } catch (err) {
      console.error("[Like] Error:", err);
      // Rollback
      setIsLiked(wasLiked);
      setLikesCount(prevCount);
      setLocalVideoData(prev => ({
        ...prev,
        isLiked: wasLiked,
        stats: { ...(prev.stats || {}), likesCount: prevCount }
      }));
    }
  };

  const handleDoubleClick = async (e) => {
      // Double-tap always likes (TikTok style)
      if (!isLiked) {
          const prevCount = likesCount;
          
          // Optimistic Like
          setIsLiked(true);
          setLikesCount(prevCount + 1);
          setLocalVideoData(prev => ({
            ...prev,
            isLiked: true,
            stats: { ...(prev.stats || {}), likesCount: prevCount + 1 }
          }));

          try {
            const response = await reelService.toggleLike(reelId);
            if (response?.success) {
               const serverCount = Number(response.likesCount);
               setIsLiked(true);
               setLikesCount(serverCount);
               setLocalVideoData(prev => ({
                 ...prev,
                 isLiked: true,
                 stats: { ...(prev.stats || {}), likesCount: serverCount }
               }));
            }
          } catch (err) {
            console.error("[DoubleTap Like] Error:", err);
            // Rollback
            setIsLiked(false);
            setLikesCount(prevCount);
            setLocalVideoData(prev => ({
              ...prev,
              isLiked: false,
              stats: { ...(prev.stats || {}), likesCount: prevCount }
            }));
          }
      }
      
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      
      // Ensure video plays
      if (!playing && videoRef.current) {
          videoRef.current.play();
          setPlaying(true);
      }
  };

  const tapTimeoutRef = useRef(null);

  // Custom tap handler to support both single tap play/pause and fast double tap like
  const handleScreenTap = (e) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 500;
    
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // Double tap detected - Clear single tap timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      handleDoubleClick(e);
      lastTapRef.current = 0; // reset
    } else {
      // Potential single tap - wait to see if it's a double tap
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        onVideoPress();
        tapTimeoutRef.current = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  // --- Save / Favorites Logic ---
  const addToFavorites = async () => {
    setIsSaved(true);
    
    // API Persistence
    try {
      await reelService.toggleSave(reelId);
    } catch (err) {
      console.error("Save persistence failed:", err);
      setIsSaved(false); // Rollback
    }

    setShowSavedToast(true);
    clearTimeout(savedToastTimeoutRef.current);
    savedToastTimeoutRef.current = setTimeout(() => setShowSavedToast(false), 2500);
  };

  const removeFromFavorites = async () => {
    setIsSaved(false);

    // API Persistence
    try {
      await reelService.toggleSave(reelId);
    } catch (err) {
      console.error("Unsave persistence failed:", err);
      setIsSaved(true); // Rollback
    }

    setShowSavedToast(false);
    clearTimeout(savedToastTimeoutRef.current);
  };

  const handleSaveClick = () => {
    if (isSaved) {
      removeFromFavorites();
      return;
    }
    const hasSeen = localStorage.getItem('hasSeenFavoritesPopup');
    if (!hasSeen) {
      setShowFavoritesModal(true);
    } else {
      addToFavorites();
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('isReelsMuted', String(nextMuted));
    
    // Show temporary overlay
    setShowMuteOverlay(true);
    setTimeout(() => setShowMuteOverlay(false), 800);
  };

  useEffect(() => {
    return () => {
      clearTimeout(savedToastTimeoutRef.current);
      clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const handleUpdate = (updatedData) => {
    setLocalVideoData(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <div className="h-full w-full relative snap-start bg-black flex justify-center items-center overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        loop
        playsInline
        preload="auto"
        muted={!isActive}
        src={localVideoData.video?.url || localVideoData.url}
        poster={localVideoData.video?.thumbnail || localVideoData.poster}
      ></video>

      {/* Hidden audio element for library music (only for non-processed reels) */}
      {localVideoData.music && (localVideoData.music.url || localVideoData.music.audioUrl) && localVideoData.status !== 'completed' && (
        <audio
          ref={audioRef}
          src={localVideoData.music.url || localVideoData.music.audioUrl}
          loop
          preload="auto"
        />
      )}

      {/* Transparent Layer for Taps (Single for play/pause, Double for like) */}
      <div 
        className="absolute inset-0 z-[25] cursor-pointer"
        onClick={handleScreenTap}
      />
      
      {/* Overlay controls */}
      <VideoOverlay 
        reelId={reelId}
        username={localVideoData.user?.username || localVideoData.username || 'user'}
        caption={localVideoData.caption}
        musicName={localVideoData.music}
        likes={likesCount}
        comments={localVideoData.stats?.commentsCount || localVideoData.comments || 0}
        shares={localVideoData.stats?.sharesCount || localVideoData.shares || 0}
        isLiked={isLiked}
        isSaved={isSaved}
        onSaveClick={handleSaveClick}
        onLikeClick={handleLikeClick}
        videoData={localVideoData}
        onUpdate={handleUpdate}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        isPlaying={playing}
      />

      {/* Mute/Unmute Overlay Icon */}
      {showMuteOverlay && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[35] bg-black/40 rounded-full p-6 flex items-center justify-center pointer-events-none animate-scale-in">
           {isMuted ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="white">
               <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
             </svg>
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="white">
               <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
             </svg>
           )}
        </div>
      )}

      {/* Play Icon when paused */}
      {!playing && isActive && !showMuteOverlay && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[35] bg-black/30 rounded-full p-4 flex items-center justify-center pointer-events-none transition-opacity duration-200">
           <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" stroke="transparent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <polygon points="5 3 19 12 5 21 5 3"></polygon>
           </svg>
        </div>
      )}

      {/* Big Heart animation on double tap */}
      {showHeart && (
         <div 
           key={Date.now()} 
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-heart-beat pointer-events-none drop-shadow-[0_0_15px_rgba(254,44,85,0.5)]"
         >
             <svg width="120" height="120" viewBox="0 0 24 24" fill="url(#heartGradient)" stroke="white" strokeWidth="0.3">
                 <defs>
                   <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" stopColor="#FF4B7E" />
                     <stop offset="100%" stopColor="#FE2C55" />
                   </linearGradient>
                 </defs>
                 <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
             </svg>
         </div>
      )}

      {/* Add to Favorites Modal */}
      <AddToFavoritesModal
        isOpen={showFavoritesModal}
        onCancel={() => setShowFavoritesModal(false)}
        onConfirm={() => {
          localStorage.setItem('hasSeenFavoritesPopup', 'true');
          setShowFavoritesModal(false);
          addToFavorites();
        }}
      />

      {/* "Added to Favorites" Toast */}
      {showSavedToast && (
        <div className="absolute bottom-[calc(var(--bottom-nav-height)+16px)] left-0 right-0 mx-4 z-50 flex items-center justify-between bg-black/85 backdrop-blur-sm rounded-lg px-4 py-3 animate-scale-in">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-white text-[14px] font-semibold">Added to Favorites</span>
          </div>
          <button className="text-white text-[13px] font-bold opacity-80">Manage &gt;</button>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
