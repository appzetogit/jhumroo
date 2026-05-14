import React, { useRef, useState, useEffect } from 'react';
import { BiX } from 'react-icons/bi';

const FullscreenPlayer = ({ isOpen, onClose, videoUrl, posterUrl }) => {
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isOpen) return;

    const handleTimeUpdate = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isOpen]);

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedProgress = x / rect.width;
    video.currentTime = clickedProgress * video.duration;
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

      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        className="w-full h-full object-cover"
        autoPlay
        loop
        controls={false}
        playsInline
      />

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

