import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import VideoOverlay from './VideoOverlay';
import AddToFavoritesModal from '../modals/AddToFavoritesModal';
import reelService from '../../../../services/reelService';
import adService from '../../../../services/adService';

const VideoCard = ({ videoData, isActive, preload = 'none' }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const watchStartTimeRef = useRef(null);
  const replayCountRef = useRef(0);
  const viewTrackedRef = useRef(false);
  const audioTrackRef = useRef(null); // Added for dynamic audio track sync
  
  const [playing, setPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('isReelsMuted');
    return saved === null ? true : saved === 'true';
  });
  const [showMuteOverlay, setShowMuteOverlay] = useState(false);
  const [localVideoData, setLocalVideoData] = useState(videoData);
  const duetVideoRef = useRef(null);
  const isDuet = localVideoData.isRemix && localVideoData.originalReel;

  // Determine if this ad contains an image instead of a video
  const isImageAd = localVideoData.isAd && (
    localVideoData.video?.type === 'image' ||
    localVideoData.media?.type === 'image'
  );

  // Sync data
  useEffect(() => {
    const prevId = localVideoData?._id || localVideoData?.id;
    const nextId = videoData?._id || videoData?.id;
    if (prevId !== nextId) {
      setLocalVideoData(videoData);
      viewTrackedRef.current = false;
    }
  }, [videoData]);

  const reelId = String(localVideoData._id || localVideoData.id || '');
  const [isLiked, setIsLiked] = useState(() => !!localVideoData.isLiked);
  const [likesCount, setLikesCount] = useState(() => Number(localVideoData.stats?.likesCount ?? localVideoData.likes ?? 0));
  const [isSaved, setIsSaved] = useState(() => !!localVideoData.isSaved);

  useEffect(() => {
    setIsLiked(!!localVideoData.isLiked);
    setIsSaved(!!localVideoData.isSaved);
    setLikesCount(Number(localVideoData.stats?.likesCount ?? localVideoData.likes ?? 0));
  }, [localVideoData]);

  // Track view for image ads (no video playback)
  useEffect(() => {
    if (!isImageAd || !isActive || viewTrackedRef.current) return;
    const timer = setTimeout(() => {
      if (isActive) {
        viewTrackedRef.current = true;
        adService.trackView(reelId);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isActive, isImageAd, reelId]);

  // HLS and Playback Logic (video only — skipped for image ads)
  useEffect(() => {
    if (isImageAd) return;

    const video = videoRef.current;
    if (!video) return;

    const videoSrc = localVideoData.hlsUrl || localVideoData.video?.url || localVideoData.url;
    if (!videoSrc) return;

    if (videoSrc.includes('.m3u8')) {
      if (Hls.isSupported()) {
        if (!hlsRef.current) {
          const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
          hlsRef.current = hls;
        }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
      }
    } else {
      video.src = videoSrc;
    }

    const handleEnded = () => { replayCountRef.current += 1; };
    video.addEventListener('ended', handleEnded);

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setPlaying(true);
          watchStartTimeRef.current = Date.now();
          if (!viewTrackedRef.current) {
            setTimeout(() => {
              if (isActive) {
                viewTrackedRef.current = true;
                if (localVideoData.isAd) adService.trackView(reelId);
                else reelService.recordView(reelId);
              }
            }, 3000);
          }
        }).catch(() => setPlaying(false));
      }
    } else {
      handlePauseAndRecord();
    }

    return () => {
      handlePauseAndRecord();
      if (video) video.removeEventListener('ended', handleEnded);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isActive, isImageAd, localVideoData.hlsUrl, localVideoData.video?.url, localVideoData.url]);

  // Audio track synchronization for raw videos with external music library sounds
  useEffect(() => {
    if (isImageAd) return;

    const video = videoRef.current;
    const videoSrc = localVideoData.hlsUrl || localVideoData.video?.url || localVideoData.url;
    const isRawVideo = videoSrc && (videoSrc.includes('/raw/') || videoSrc.includes('recording.webm'));
    const hasExternalMusic = localVideoData.music && localVideoData.music.url && isRawVideo;

    if (!hasExternalMusic || !isActive) {
      if (audioTrackRef.current) {
        audioTrackRef.current.pause();
        audioTrackRef.current = null;
      }
      return;
    }

    console.log(`[VideoCard:${reelId}] Setting up dynamic audio track sync for raw video with music:`, localVideoData.music.url);

    if (!audioTrackRef.current || audioTrackRef.current.src !== localVideoData.music.url) {
      if (audioTrackRef.current) audioTrackRef.current.pause();
      audioTrackRef.current = new Audio(localVideoData.music.url);
      audioTrackRef.current.loop = true;
    }

    const audio = audioTrackRef.current;
    audio.muted = isMuted;

    const syncAudio = () => {
      if (!video || !audio) return;
      const targetTime = (localVideoData.music.startTime || 0) + video.currentTime;
      const diff = Math.abs(audio.currentTime - targetTime);
      if (diff > 0.15) {
        audio.currentTime = targetTime;
      }
    };

    const handlePlay = () => {
      audio.muted = isMuted;
      syncAudio();
      audio.play().catch(err => console.warn("Failed to play dynamic audio track:", err));
    };

    const handlePause = () => {
      audio.pause();
    };

    const handleTimeUpdate = () => {
      syncAudio();
    };

    const handleSeeking = () => {
      syncAudio();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);

    // Sync current playing state
    if (playing && isActive) {
      handlePlay();
    } else {
      handlePause();
    }

    return () => {
      if (video) {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('seeking', handleSeeking);
      }
      if (audio) {
        audio.pause();
      }
    };
  }, [isActive, isImageAd, localVideoData.music, localVideoData.hlsUrl, localVideoData.video?.url, localVideoData.url, playing, isMuted]);

  // Synchronize duet original video with main video
  useEffect(() => {
    if (!isDuet) return;
    const mainVideo = videoRef.current;
    const duetVideo = duetVideoRef.current;
    if (!mainVideo || !duetVideo) return;

    const handlePlay = () => {
      duetVideo.play().catch(err => console.warn("Failed to play duet video:", err));
    };

    const handlePause = () => {
      duetVideo.pause();
    };

    const handleTimeUpdate = () => {
      const diff = Math.abs(duetVideo.currentTime - mainVideo.currentTime);
      if (diff > 0.15) {
        duetVideo.currentTime = mainVideo.currentTime;
      }
    };

    const handleSeeking = () => {
      duetVideo.currentTime = mainVideo.currentTime;
    };

    mainVideo.addEventListener('play', handlePlay);
    mainVideo.addEventListener('pause', handlePause);
    mainVideo.addEventListener('timeupdate', handleTimeUpdate);
    mainVideo.addEventListener('seeking', handleSeeking);

    // Initial sync
    if (!mainVideo.paused && isActive) {
      handlePlay();
    } else {
      handlePause();
    }

    return () => {
      mainVideo.removeEventListener('play', handlePlay);
      mainVideo.removeEventListener('pause', handlePause);
      mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
      mainVideo.removeEventListener('seeking', handleSeeking);
    };
  }, [isActive, isDuet, localVideoData.video?.url, localVideoData.originalReel?.video?.url, playing]);

  const handlePauseAndRecord = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      setPlaying(false);
      if (watchStartTimeRef.current) {
        const watchDuration = (Date.now() - watchStartTimeRef.current) / 1000;
        const totalDuration = video.duration || 0;
        const completionPercentage = totalDuration > 0 ? (video.currentTime / totalDuration) * 100 : 0;
        const isFullWatch = completionPercentage >= 95;
        if (watchDuration > 0.5 && !localVideoData.isAd) {
          reelService.submitAnalytics(reelId, {
            watchDuration, completionPercentage,
            replayCount: replayCountRef.current, isFullWatch,
            swipeTiming: watchDuration,
            deviceInfo: { platform: 'web', appVersion: '1.0.0' }
          });
        }
        watchStartTimeRef.current = null;
        replayCountRef.current = 0;
      }
    }
  };

  const handleScreenTap = () => {
    if (isImageAd) return;
    if (playing) {
      handlePauseAndRecord();
    } else {
      videoRef.current?.play().then(() => {
        setPlaying(true);
        watchStartTimeRef.current = Date.now();
      });
    }
  };

  const handleDoubleClick = () => {
    if (!isLiked) handleLikeClick();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  };

  const handleLikeClick = async (e) => {
    if (e) e.stopPropagation();
    const wasLiked = isLiked;
    const nextLiked = !wasLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    try {
      const response = await reelService.toggleLike(reelId);
      if (response?.success) {
        setLikesCount(response.likesCount);
        setIsLiked(response.isLiked);
      }
    } catch (err) {
      setIsLiked(wasLiked);
      setLikesCount(likesCount);
    }
  };

  const handleSaveClick = async () => {
    if (isSaved) {
      setIsSaved(false);
      try { await reelService.toggleSave(reelId); } catch { setIsSaved(true); }
      return;
    }
    const hasSeen = localStorage.getItem('hasSeenFavoritesPopup');
    if (!hasSeen) { setShowFavoritesModal(true); return; }
    setIsSaved(true);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
    try {
      await reelService.toggleSave(reelId);
    } catch (err) {
      setIsSaved(false);
      setShowSavedToast(false);
    }
  };

  const handleUpdate = (updatedData) => {
    if (!updatedData) return;
    setLocalVideoData(prev => {
      const mergedStats = updatedData.stats
        ? { ...(prev?.stats || {}), ...updatedData.stats }
        : prev?.stats;
      return { ...prev, ...updatedData, ...(mergedStats ? { stats: mergedStats } : {}) };
    });
  };

  const handleMuteToggle = () => {
    if (isImageAd) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('isReelsMuted', String(nextMuted));
    setShowMuteOverlay(true);
    setTimeout(() => setShowMuteOverlay(false), 800);
  };

  const imageSrc = localVideoData.video?.url || localVideoData.media?.url || localVideoData.url;

  return (
    <div className="h-full w-full relative bg-black flex justify-center items-center overflow-hidden">

      {/* Render img for image ads, video for everything else */}
      {isImageAd ? (
        <img
          src={imageSrc}
          alt={localVideoData.caption || 'Sponsored'}
          className="absolute inset-0 w-full h-full object-cover bg-black"
          style={{ objectFit: 'cover' }}
          onClick={(e) => { if (e.detail === 2) handleDoubleClick(); }}
        />
      ) : isDuet ? (
        <div className="absolute top-1/2 -translate-y-1/2 w-full aspect-[9/8] flex flex-row bg-black overflow-hidden z-0">
          {/* Left: Original Reel Video */}
          <div className="w-1/2 h-full relative border-r border-white/10 flex items-center justify-center bg-black">
            <video
              ref={duetVideoRef}
              className="w-full h-full object-cover"
              style={{ objectFit: 'cover' }}
              src={localVideoData.originalReel.video?.url}
              loop
              playsInline
              preload={preload}
              muted={isMuted}
              onClick={(e) => {
                if (e.detail === 2) handleDoubleClick();
                else handleScreenTap();
              }}
            />
            {/* Original Creator Name tag overlay */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1 z-10 pointer-events-none">
              <span className="w-1.5 h-1.5 bg-[#fe2c55] rounded-full"></span>
              @{localVideoData.originalReel.user?.username || 'creator'}
            </div>
          </div>
          
          {/* Right: Recorded Duet Video */}
          <div className="w-1/2 h-full relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              style={{ willChange: 'transform', objectFit: 'cover' }}
              loop
              playsInline
              preload={preload}
              muted={isMuted}
              poster={localVideoData.video?.thumbnail || localVideoData.poster}
              onClick={(e) => {
                if (e.detail === 2) handleDoubleClick();
                else handleScreenTap();
              }}
            />
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover bg-black"
          style={{ willChange: 'transform', objectFit: 'cover' }}
          loop
          playsInline
          preload={preload}
          muted={isMuted}
          poster={localVideoData.video?.thumbnail || localVideoData.poster}
          onClick={(e) => {
            if (e.detail === 2) handleDoubleClick();
            else handleScreenTap();
          }}
        />
      )}

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
        isImageAd={isImageAd}
      />

      {showMuteOverlay && !isImageAd && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[35] bg-black/40 rounded-full p-6 flex items-center justify-center pointer-events-none animate-scale-in">
          {isMuted ? (
            <svg width="60" height="60" viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          ) : (
            <svg width="60" height="60" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          )}
        </div>
      )}

      {!playing && isActive && !showMuteOverlay && !isImageAd && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[35] bg-black/30 rounded-full p-4 flex items-center justify-center pointer-events-none transition-opacity duration-200">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      )}

      {showHeart && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-heart-beat pointer-events-none drop-shadow-[0_0_15px_rgba(254,44,85,0.5)]">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="#FE2C55"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </div>
      )}

      <AddToFavoritesModal
        isOpen={showFavoritesModal}
        onCancel={() => setShowFavoritesModal(false)}
        onConfirm={() => {
          localStorage.setItem('hasSeenFavoritesPopup', 'true');
          setShowFavoritesModal(false);
          handleSaveClick();
        }}
      />

      {showSavedToast && (
        <div className="absolute bottom-[calc(var(--bottom-nav-height)+32px)] left-0 right-0 mx-4 z-50 flex items-center justify-between bg-black/85 backdrop-blur-sm rounded-lg px-4 py-3 animate-scale-in">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span className="text-white text-[14px] font-semibold">Added to Favorites</span>
          </div>
          <button className="text-white text-[13px] font-bold opacity-80">Manage &gt;</button>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
