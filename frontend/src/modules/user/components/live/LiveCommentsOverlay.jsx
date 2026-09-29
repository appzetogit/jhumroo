import React, { useRef, useEffect } from 'react';

/**
 * Instagram-style scrolling live comments overlay
 */
export default function LiveCommentsOverlay({ comments = [] }) {
  const containerRef = useRef(null);

  // Auto-scroll to latest comment smoothly
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [comments]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar mask-gradient-top pointer-events-auto px-1 select-none"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 15%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%)'
      }}
    >
      {comments.map((c) => {
        if (c.isSystem) {
          return (
            <div key={c._id} className="inline-flex items-center gap-1.5 self-start bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-white/80 animate-in fade-in duration-200">
              <span className="text-amber-400">✨</span>
              <span>{c.text}</span>
            </div>
          );
        }

        const username = c.user?.username || 'User';
        const avatarUrl =
          c.user?.profilePicture?.url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

        return (
          <div
            key={c._id}
            className="flex items-start gap-2 self-start max-w-[85%] bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-white/10 shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <img
              src={avatarUrl}
              alt={username}
              className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/20 mt-0.5"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white/90 truncate leading-tight">
                {username}
              </span>
              <span className="text-[12.5px] text-white break-words leading-snug">
                {c.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
