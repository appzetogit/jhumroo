import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiX } from 'react-icons/bi';
import liveService from '../../../../services/liveService';

export default function LiveDiscoverModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [activeLives, setActiveLives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchLives = async () => {
      try {
        setLoading(true);
        const res = await liveService.getActiveLives();
        if (isMounted && res.liveStreams) {
          setActiveLives(res.liveStreams);
        }
      } catch (err) {
        console.error('Error fetching active lives:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLives();
    const interval = setInterval(fetchLives, 10000); // Poll every 10s while open

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#18181b] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-[10px] font-black uppercase tracking-wider text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <h2 className="text-white font-extrabold text-base">Live Streams</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 active:scale-95 transition-transform"
          >
            <BiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/60">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold">Finding live streams...</p>
            </div>
          ) : activeLives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-white">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl mb-3">
                📡
              </div>
              <h3 className="font-extrabold text-base mb-1">No Active Live Streams</h3>
              <p className="text-white/50 text-xs mb-6 max-w-xs leading-relaxed">
                None of your friends or creators are currently broadcasting. Be the first to go live!
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/create');
                }}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
              >
                Go Live Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeLives.map((stream) => {
                const broadcaster = stream.broadcaster;
                const avatar =
                  broadcaster?.profilePicture?.url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${broadcaster?.username}`;

                return (
                  <div
                    key={stream._id}
                    onClick={() => {
                      onClose();
                      navigate(`/live/${stream._id}`);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={avatar}
                          alt={broadcaster?.username}
                          className="w-12 h-12 rounded-full object-cover border-2 border-red-500"
                        />
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-red-600 text-[9px] font-black uppercase text-white rounded-full">
                          LIVE
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-extrabold text-white truncate">
                            {broadcaster?.username || 'Creator'}
                          </span>
                          {broadcaster?.isVerified && (
                            <span className="text-blue-400 text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-white/70 text-xs truncate max-w-[180px]">
                          {stream.title || 'Going Live on Jhumroo'}
                        </p>
                        <span className="text-white/40 text-[10px] mt-0.5">
                          👁️ {stream.currentViewersCount || 0} watching
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-md shrink-0 ml-2"
                    >
                      Watch
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
