import React, { useState, useEffect } from 'react';
import { 
  BiBookmark, 
  BiBookmarkPlus, 
  BiShareAlt, 
  BiFlag, 
  BiX, 
  BiBlock, 
  BiEditAlt, 
  BiTrash, 
  BiDownload, 
  BiFullscreen, 
  BiRepeat,
  BiMinusCircle,
  BiPlusCircle
} from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import reelService from '../../../../services/reelService';
import userService from '../../../../services/userService';
import api from '../../../../services/api';

const MoreOptionsSheet = ({ 
  isOpen, 
  onClose, 
  reelData, 
  isSaved, 
  onSaveClick, 
  onShareClick,
  onReportClick, 
  onEditClick, 
  onDeleteClick,
  onNotInterestedClick,
  onInterestedClick,
  onFullscreenClick
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen && !isClosing) return null;
  if (!reelData && isOpen) return null;

  const isOwner = user?._id && reelData?.user && (user._id === (reelData.user._id || reelData.user));

  const handleDownload = async () => {
    if (!reelData?._id) {
      alert("Video ID not found.");
      return;
    }

    setIsDownloading(true);
    try {
      // 1. Fetch direct download URL (S3 presigned URL or direct local/Cloudinary URL)
      const data = await api.get(`/reels/${reelData._id}/download?json=true`);
      
      if (data && data.downloadUrl) {
        // 2. Trigger direct browser download using anchor element
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        
        // Since S3 presigned URL sets ResponseContentDisposition: attachment, it forces download immediately.
        link.setAttribute('download', `jhumroo-reel-${reelData._id}.mp4`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("Download URL not found in API response");
      }
    } catch (err) {
      console.error("Error downloading reel via proxy:", err);
      // Fallback: direct download as a last resort
      const videoUrl = reelData?.video?.url || reelData?.url;
      if (videoUrl) {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.target = '_blank';
        link.setAttribute('download', `jhumroo-reel-${reelData._id}.mp4`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Error downloading video. Please try again.");
      }
    } finally {
      setIsDownloading(false);
      handleClose();
    }
  };

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (startY === null) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      handleClose();
    } else {
      setCurrentY(0);
    }
    setStartY(null);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setCurrentY(0);
    }, 300);
  };

  const handleShare = async () => {
    onShareClick?.();
    handleClose();
  };

  const BubbleOptionItem = ({ icon: Icon, label, onClick, color, isActive }) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex flex-col items-center gap-2 min-w-[70px] active:scale-90 transition-all"
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
        isActive 
          ? 'bg-tiktok-red text-white' 
          : isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
      } ${color ? `text-${color}` : ''}`}>
        <Icon />
      </div>
      <span className={`text-[11px] font-bold ${isDarkMode ? 'text-white/80' : 'text-black/70'}`}>{label}</span>
    </button>
  );

  const OptionItem = ({ icon: Icon, label, onClick, color, subLabel, isActive }) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center p-4 gap-4 active:bg-white/5 transition-all ${
        isDarkMode ? 'border-b border-white/5' : 'border-b border-black/5'
      }`}
    >
      <div className={`text-2xl flex items-center justify-center ${
        isActive 
          ? 'text-tiktok-red' 
          : isDarkMode ? 'text-white/90' : 'text-black/80'
      } ${color ? `text-${color}` : ''}`}>
        <Icon />
      </div>
      <div className="flex flex-col items-start flex-1">
        <span className={`text-[15px] font-semibold ${isDarkMode ? 'text-white/90' : 'text-black/90'}`}>{label}</span>
        {subLabel && <span className={`text-[12px] opacity-40 font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{subLabel}</span>}
      </div>
    </button>
  );

  const ActionRow = ({ children, horizontal }) => (
    <div className={horizontal ? "flex justify-between px-4 py-4" : "flex flex-col"}>
      {children}
    </div>
  );

  return (
    <div 
      className={`fixed inset-0 z-[5000] flex flex-col justify-end transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      } ${isDarkMode ? 'bg-black/70' : 'bg-black/40'}`}
      data-modal-open={isOpen && !isClosing ? "true" : "false"}
      onClick={handleClose}
    >
      <div 
        className={`w-full max-h-[85vh] overflow-y-auto rounded-t-[20px] pb-[calc(var(--safe-area-bottom)+40px)] transition-transform duration-300 transform no-scrollbar ${
          isOpen && !isClosing ? 'translate-y-0' : 'translate-y-full'
        } ${
          isDarkMode 
            ? 'bg-[#161823] text-white border-t border-white/5' 
            : 'bg-white text-black shadow-2xl shadow-black/50'
        }`}
        style={{ transform: `translateY(${currentY}px)` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex flex-col items-center pt-3 pb-4 sticky top-0 z-10 bg-inherit">
          <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/10'}`}></div>
        </div>

        <div className="px-2">
          {/* Action Row: Social & Interactions (Bubbles) */}
          <ActionRow horizontal={true}>
            <BubbleOptionItem 
              icon={isSaved ? BiBookmark : BiBookmarkPlus} 
              label={isSaved ? "Saved" : "Save Reel"} 
              isActive={isSaved}
              onClick={() => {
                onSaveClick();
              }}
            />
            <BubbleOptionItem 
              icon={BiShareAlt} 
              label="Share" 
              onClick={handleShare}
            />
            {((reelData?.user?.downloadPrivacy !== 'Off') && (reelData?.allowDownload !== false)) && (
              <BubbleOptionItem 
                icon={isDownloading ? () => <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : BiDownload} 
                label={isDownloading ? "Downloading..." : "Download"} 
                onClick={handleDownload}
              />
            )}
            <BubbleOptionItem 
              icon={BiFullscreen} 
              label="Fullscreen" 
              onClick={() => {
                onFullscreenClick();
              }}
            />
          </ActionRow>

          <div className={`h-[1px] mx-4 my-2 ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} />

          {/* Combined Vertical List for Equal Spacing */}
          <ActionRow>
            <OptionItem 
              icon={BiRepeat} 
              label="Remix" 
              subLabel="Create Side-by-side"
              onClick={() => {
                alert("Remix feature coming soon!");
                handleClose();
              }}
            />
            <OptionItem 
              icon={BiPlusCircle} 
              label="Interested" 
              color="success"
              onClick={() => {
                onInterestedClick();
                handleClose();
              }}
            />
            <OptionItem 
              icon={BiMinusCircle} 
              label="Not interested" 
              color="warning"
              onClick={() => {
                onNotInterestedClick();
                handleClose();
              }}
            />
            <OptionItem 
              icon={BiFlag} 
              label="Report" 
              color="danger"
              onClick={() => {
                onReportClick();
                // handleClose();
              }}
            />
            {isOwner && (
              <>
                <OptionItem 
                  icon={BiEditAlt} 
                  label="Edit Reel" 
                  onClick={() => {
                    onEditClick();
                    // handleClose();
                  }}
                />
                <OptionItem 
                  icon={BiTrash} 
                  label="Delete" 
                  color="danger"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this reel?")) {
                      onDeleteClick();
                      handleClose();
                    }
                  }}
                />
              </>
            )}
          </ActionRow>
        </div>
      </div>
    </div>
  );
};

export default MoreOptionsSheet;
