import React, { useEffect, useRef, useState, memo } from 'react';
import { FILTER_PRESETS, ALL_FILTERS_MAP } from '../utils/createConstants';
import { parseDurationSeconds, computeAdjustmentFilterCss } from '../utils/createUtils';

export const DynamicAudioDuration = ({ soundItem }) => {
  const [duration, setDuration] = useState(() => parseDurationSeconds(soundItem.duration));

  useEffect(() => {
    if (!duration && soundItem.url) {
      const tempAudio = new window.Audio(soundItem.url);
      tempAudio.onloadedmetadata = () => {
        setDuration(tempAudio.duration);
      };
    }
  }, [soundItem.url, duration]);

  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const formatted = duration ? `${mins}:${secs.toString().padStart(2, '0')}` : '0:00';

  return <>{formatted}</>;
};

export const MediaPreview = ({ image, rotation = 0, className = '', filter = 'Normal', framed = false, adjustments = null }) => {
  const isQuarterTurn = Math.abs(rotation % 180) === 90;
  
  const getFilter = () => {
    const base = filter === 'Normal' ? '' : (ALL_FILTERS_MAP[filter] || FILTER_PRESETS[filter] || '');
    if (!adjustments) return base || 'none';
    const adj = computeAdjustmentFilterCss(adjustments);
    return `${base} ${adj}`.trim() || 'none';
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-all duration-300"
          onError={(e) => { e.target.style.display = 'none'; }}
          style={{
            transform: `rotate(${rotation}deg) scale(${isQuarterTurn ? 0.68 : 1})`,
            transformOrigin: 'center center',
            filter: getFilter()
          }}
        />
      )}
      {/* Vignette Overlay */}
      {adjustments && adjustments.vignette > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
          style={{
            background: `radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, ${adjustments.vignette * 0.009}) 95%, rgba(0, 0, 0, ${adjustments.vignette * 0.01}) 100%)`
          }}
        />
      )}
      {/* Grain Overlay */}
      {adjustments && adjustments.grain > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay transition-opacity duration-150"
          style={{
            opacity: adjustments.grain * 0.008,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 pointer-events-none" />
      {framed && <div className="absolute inset-0 ring-1 ring-white/10 pointer-events-none" />}
    </div>
  );
};

export const DraggableOverlay = ({ overlay, index, setActiveOverlays, setIsDraggingAny, setIsOverDeleteZone, showToast }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        const angle = Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);
        
        if (el.lastDist !== undefined) {
          const deltaScale = dist / el.lastDist;
          const deltaAngle = angle - el.lastAngle;
          
          setActiveOverlays(prev => prev.map((o, i) => 
            i === index ? { 
              ...o, 
              scale: Math.max(0.2, Math.min(5, (o.scale || 1) * deltaScale)),
              rotation: (o.rotation || 0) + deltaAngle
            } : o
          ));
        }
        el.lastDist = dist;
        el.lastAngle = angle;
      }
    };

    const handleTouchEnd = () => {
      el.lastDist = undefined;
      el.lastAngle = undefined;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setActiveOverlays(prev => prev.map((o, i) => 
        i === index ? { ...o, scale: Math.max(0.2, Math.min(5, (o.scale || 1) * delta)) } : o
      ));
    };

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [index, setActiveOverlays]);

  return (
    <div
      ref={ref}
      className="absolute z-40 pointer-events-auto cursor-move select-none touch-none overflow-hidden rounded-[12px] border-2 border-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
      style={{
        left: `calc(50% + ${overlay.x}px)`,
        top: `calc(50% + ${overlay.y}px)`,
        transform: `translate(-50%, -50%) scale(${overlay.scale || 1}) rotate(${overlay.rotation || 0}deg)`,
        width: '150px',
        aspectRatio: overlay.type === 'video' ? '9/16' : 'auto',
        maxHeight: '260px'
      }}
      onPointerDown={(e) => {
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = overlay.x;
        const initialY = overlay.y;
        setIsDraggingAny(true);
        
        const moveHandler = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          setActiveOverlays(prev => prev.map((o, i) => 
            i === index ? { ...o, x: initialX + dx, y: initialY + dy } : o
          ));

          const screenHeight = window.innerHeight;
          if (moveEvent.clientY > screenHeight * 0.7) {
            setIsOverDeleteZone(true);
          } else {
            setIsOverDeleteZone(false);
          }
        };
        
        const upHandler = (upEvent) => {
          const screenHeight = window.innerHeight;
          if (upEvent.clientY > screenHeight * 0.7) {
            setActiveOverlays(prev => prev.filter((_, i) => i !== index));
            showToast('Overlay deleted');
          }
          setIsDraggingAny(false);
          setIsOverDeleteZone(false);
          target.removeEventListener('pointermove', moveHandler);
          target.removeEventListener('pointerup', upHandler);
        };
        
        target.addEventListener('pointermove', moveHandler);
        target.addEventListener('pointerup', upHandler);
      }}
    >
      {overlay.type === 'video' ? (
        <video 
          src={overlay.url} 
          loop 
          muted 
          playsInline 
          className="h-full w-full object-cover"
          onCanPlay={(e) => {
            e.target.play().catch(err => {
              if (err.name !== 'AbortError') console.warn("Overlay video play failed:", err);
            });
          }}
        />
      ) : (
        <img src={overlay.url} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  );
};

export const TimelineThumbnail = memo(({ src, isVideo, i, videoDuration }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (isVideo && videoRef.current && videoDuration > 0) {
      const targetTime = i * 2;
      if (targetTime <= videoDuration) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [isVideo, i, videoDuration]);

  if (src && !isVideo) {
    return (
      <img 
        src={src} 
        loading="lazy"
        className="w-full h-full object-cover" 
        alt="" 
      />
    );
  }
  
  return (
    <div className="w-full h-full bg-[#2a2a2c] flex items-center justify-center">
       <div className="w-4 h-4 rounded-full border border-white/5 animate-pulse" />
    </div>
  );
});
