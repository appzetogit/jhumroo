import React, { useRef, useState, useEffect } from 'react';
import { BiX } from 'react-icons/bi';

const FullscreenPlayer = ({ isOpen, onClose, videoUrl, posterUrl, videoData }) => {
  const videoRef = useRef(null);
  const duetVideoRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const isDuet = videoData?.isRemix && videoData?.originalReel;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isOpen || !videoUrl) return;
    
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (err.name !== 'AbortError') console.warn("Fullscreen play failed:", err);
      });
    }

    const handleTimeUpdate = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p || 0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.pause();
    };
  }, [isOpen, videoUrl]);

  // Synchronize duet original video with main video in fullscreen
  useEffect(() => {
    if (!isDuet || !isOpen) return;
    const mainVideo = videoRef.current;
    const duetVideo = duetVideoRef.current;
    if (!mainVideo || !duetVideo) return;

    const handlePlay = () => {
      duetVideo.play().catch(err => console.warn("Failed to play duet video in fullscreen:", err));
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
    if (!mainVideo.paused) {
      handlePlay();
    } else {
      handlePause();
    }

    return () => {
      mainVideo.removeEventListener('play', handlePlay);
      mainVideo.removeEventListener('pause', handlePause);
      mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
      mainVideo.removeEventListener('seeking', handleSeeking);
      duetVideo.pause();
    };
  }, [isOpen, isDuet]);

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedProgress = x / rect.width;
    video.currentTime = clickedProgress * video.duration;
  };

  const handleTap = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => console.warn(err));
    } else {
      video.pause();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center animate-fade-in">
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-8 right-6 z-[10001] w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-all"
      >
        <BiX size={32} />
      </button>

      {/* Video View */}
      {isDuet ? (
        <div className="absolute top-1/2 -translate-y-1/2 w-full aspect-[9/8] flex flex-row bg-black overflow-hidden z-0">
          {/* Left: Original Reel Video */}
          <div className="w-1/2 h-full relative border-r border-white/10 flex items-center justify-center bg-black">
            <video
              ref={duetVideoRef}
              className="w-full h-full object-cover"
              style={{ objectFit: 'cover' }}
              src={videoData.originalReel.video?.url}
              loop
              playsInline
              controls={false}
              onClick={handleTap}
            />
            {/* Original Creator Name tag overlay */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1 z-10 pointer-events-none">
              <span className="w-1.5 h-1.5 bg-[#fe2c55] rounded-full"></span>
              @{videoData.originalReel.user?.username || 'creator'}
            </div>
          </div>
          
          {/* Right: Recorded Duet Video */}
          <div className="w-1/2 h-full relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              style={{ objectFit: 'cover' }}
              src={videoUrl}
              poster={posterUrl}
              loop
              playsInline
              controls={false}
              onClick={handleTap}
            />
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectFit: 'cover' }}
          loop
          controls={false}
          playsInline
          onClick={handleTap}
        />
      )}

      {/* Progress Bar (Play Line) */}
      <div 
        className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20 cursor-pointer z-[10002]"
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-tiktok-red transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default FullscreenPlayer;

