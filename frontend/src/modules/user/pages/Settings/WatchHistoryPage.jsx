import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiTrash, BiPlay, BiVideo } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useToast } from '../../../../context/ToastContext';
import userService from '../../../../services/userService';

// Helper to format view numbers like 1.2K, 3.4M
const formatCount = (num) => {
  if (!num || isNaN(num)) return '0';
  const n = Number(num);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
};

const WatchHistoryCard = ({ item, onClick }) => {
  const thumbnailSrc = item.video?.thumbnail || item.thumbnail || '';
  const videoUrl = item.video?.url || '';
  const isPhoto = item.isPhoto || item.type === 'photo';
  const viewsCount = item.stats?.viewsCount || 0;

  // Filter out invalid/expired blob URLs
  const cleanThumbnail =
    typeof thumbnailSrc === 'string' && !thumbnailSrc.startsWith('blob:')
      ? thumbnailSrc
      : '';
  const cleanVideoUrl =
    typeof videoUrl === 'string' && !videoUrl.startsWith('blob:')
      ? videoUrl
      : '';

  const isVideoFile =
    cleanVideoUrl.toLowerCase().endsWith('.mp4') ||
    cleanVideoUrl.toLowerCase().endsWith('.webm') ||
    cleanVideoUrl.toLowerCase().endsWith('.mov') ||
    cleanVideoUrl.toLowerCase().includes('.m3u8');

  const isPhotoMedia =
    !isVideoFile &&
    Boolean(
      isPhoto ||
        (cleanVideoUrl && cleanVideoUrl.match(/\.(jpeg|jpg|png|webp)($|\?)/i))
    );

  const imageDisplayUrl = isPhotoMedia
    ? cleanVideoUrl || cleanThumbnail
    : cleanThumbnail;
  const hasImage = Boolean(
    imageDisplayUrl &&
      !imageDisplayUrl.endsWith('.mp4') &&
      !imageDisplayUrl.endsWith('.webm') &&
      imageDisplayUrl.trim() !== ''
  );

  return (
    <div
      onClick={onClick}
      className="relative aspect-[3/4] bg-[#18181b] overflow-hidden cursor-pointer group select-none transition-transform active:opacity-80"
    >
      {hasImage ? (
        <img
          src={imageDisplayUrl}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : cleanVideoUrl ? (
        <video
          src={cleanVideoUrl}
          preload="metadata"
          muted
          playsInline
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full bg-[#202024] flex items-center justify-center text-white/30">
          <BiPlay size={32} />
        </div>
      )}

      {/* Dark bottom gradient shadow for contrast */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none z-[5]" />

      {/* Bottom-left View count */}
      <div className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[12px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] z-10">
        <BiPlay size={15} className="text-white" />
        <span>{formatCount(viewsCount)}</span>
      </div>

      {/* Top-right Photo Indicator if photo post */}
      {isPhotoMedia && (
        <div className="absolute top-2 right-2 z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect
              x="6.5"
              y="6.5"
              width="11.5"
              height="11.5"
              rx="3.5"
              fill="#FFFFFF"
              fillOpacity="0.68"
            />
            <rect
              x="2.8"
              y="2.8"
              width="11.5"
              height="11.5"
              rx="3.5"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

const WatchHistoryPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { showToast } = useToast?.() || { showToast: (msg) => alert(msg) };

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch watch history from backend
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await userService.getWatchHistory(1, 60);
      if (res.success && Array.isArray(res.history)) {
        setHistory(res.history);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to load watch history:', err);
      showToast('Could not load watch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleReelClick = (item) => {
    const targetId = item.reelId || item._id;
    if (targetId) {
      navigate(`/reel/${targetId}`);
    }
  };

  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      {/* ======================= HEADER ======================= */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 relative bg-white dark:bg-[#121212] z-20 border-b theme-panel-divider">
        <div
          className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
          onClick={() => navigate(-1)}
        >
          <BiChevronLeft size={24} className="theme-text-primary opacity-80" />
        </div>
        <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">
          Watch history
        </h2>
        <div className="w-10"></div>
      </div>

      {/* ======================= CONTENT AREA ======================= */}
      <div className="scrollable flex-1 pb-16">
        {loading ? (
          /* Skeletons loader */
          <div className="grid grid-cols-3 gap-[2px] p-[2px]">
            {Array.from({ length: 15 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[3/4] bg-gray-200 dark:bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          /* Empty state matching TikTok aesthetic */
          <div className="flex-1 flex flex-col items-center justify-center pt-32 text-center px-6 animate-fade-in">
            <div className="w-24 h-24 mb-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <BiVideo size={48} className="text-gray-400 dark:text-gray-500 opacity-80" />
            </div>
            <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">
              No watch history yet
            </h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              Videos you watch will appear here.
            </p>
          </div>
        ) : (
          /* Continuous 3-Column Video Grid */
          <div className="grid grid-cols-3 gap-[2px] bg-black/5 dark:bg-white/5">
            {history.map((item, idx) => (
              <WatchHistoryCard
                key={item.reelId || item._id || idx}
                item={item}
                onClick={() => handleReelClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchHistoryPage;
