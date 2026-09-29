import React, { useState, useEffect } from 'react';

/**
 * Instagram-style floating reactions that float up from the bottom-right
 * and fade out with randomized paths and scales.
 */
export default function LiveFloatingReactions({ reactions = [] }) {
  const [activeItems, setActiveItems] = useState([]);

  useEffect(() => {
    if (!reactions || reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];
    if (!latest?.id) return;

    const newItem = {
      id: latest.id,
      emoji: latest.emoji || '❤️',
      drift: (Math.random() - 0.5) * 60, // -30px to +30px drift
      scale: 0.85 + Math.random() * 0.45, // 0.85x to 1.3x scale
      duration: 2.2 + Math.random() * 0.8, // 2.2s to 3s
      createdAt: Date.now()
    };

    setActiveItems((prev) => [...prev.slice(-25), newItem]);

    const timer = setTimeout(() => {
      setActiveItems((prev) => prev.filter((item) => item.id !== newItem.id));
    }, newItem.duration * 1000);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <div className="absolute right-4 bottom-24 pointer-events-none z-30 w-24 h-80 overflow-hidden flex flex-col justify-end items-center">
      {activeItems.map((item) => (
        <span
          key={item.id}
          className="absolute bottom-0 text-3xl select-none animate-live-float drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          style={{
            '--drift-x': `${item.drift}px`,
            '--custom-scale': item.scale,
            animationDuration: `${item.duration}s`
          }}
        >
          {item.emoji}
        </span>
      ))}
      <style>{`
        @keyframes liveFloatUp {
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0.9;
          }
          50% {
            transform: translateY(-130px) translateX(var(--drift-x)) scale(var(--custom-scale));
            opacity: 1;
          }
          100% {
            transform: translateY(-280px) translateX(calc(var(--drift-x) * 1.5)) scale(calc(var(--custom-scale) * 1.15));
            opacity: 0;
          }
        }
        .animate-live-float {
          animation: liveFloatUp linear forwards;
        }
      `}</style>
    </div>
  );
}
