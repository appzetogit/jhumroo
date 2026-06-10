import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import duetIcon from '../../../../assets/duet_icon.png';
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
  BiPlusCircle,
  BiArrowFromBottom
} from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import reelService from '../../../../services/reelService';
import userService from '../../../../services/userService';
import api from '../../../../services/api';

const BubbleOptionItem = ({ icon: Icon, label, onClick, color, isActive, isDarkMode }) => (
  <button 
    type="button"
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
      {typeof Icon === 'string' ? (
        <img 
          src={Icon} 
          alt={label} 
          className={`w-7 h-7 object-contain ${
            isActive 
              ? 'brightness-0 invert' 
              : isDarkMode ? 'brightness-0 invert' : 'brightness-0'
          }`} 
        />
      ) : (
        <Icon />
      )}
    </div>
    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-white/80' : 'text-black/70'}`}>{label}</span>
  </button>
);

const OptionItem = ({ icon: Icon, label, onClick, color, subLabel, isActive, isDarkMode }) => (
  <button 
    type="button"
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
  const navigate = useNavigate();
  const startYRef = useRef(null);
  const [currentY, setCurrentY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      // Direct native browser download request. Bypasses CORS, JS blocks, and popup blockers completely!
      window.location.href = `${api.defaults.baseURL}/reels/${reelData._id}/download`;
    } catch (err) {
      console.error("Error initiating download:", err);
      alert("Error initiating download. Please try again.");
    } finally {
      // Small timeout to allow the browser to register the download request
      setTimeout(() => {
        setIsDownloading(false);
        handleClose();
      }, 1000);
    }
  };

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (startYRef.current === null) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
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
    startYRef.current = null;
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
              isDarkMode={isDarkMode}
              onClick={() => {
                onSaveClick();
              }}
            />
            <BubbleOptionItem 
              icon={BiShareAlt} 
              label="Share" 
              isDarkMode={isDarkMode}
              onClick={handleShare}
            />
            {(!reelData?.user?.isPrivate && reelData?.allowDuet !== false) && (
              <BubbleOptionItem 
                icon={duetIcon} 
                label="Duet" 
                isDarkMode={isDarkMode}
                onClick={() => {
                  handleClose();
                  navigate(`/create?duet=${reelData._id}`, { state: { duetVideo: reelData } });
                }}
              />
            )}
            {((reelData?.user?.downloadPrivacy !== 'Off') && (reelData?.allowDownload !== false)) && (
              <BubbleOptionItem 
                icon={isDownloading ? () => <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : BiDownload} 
                label={isDownloading ? "Downloading..." : "Download"} 
                isDarkMode={isDarkMode}
                onClick={handleDownload}
              />
            )}
            <BubbleOptionItem 
              icon={BiFullscreen} 
              label="Fullscreen" 
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
              onClick={() => {
                alert("Remix feature coming soon!");
                handleClose();
              }}
            />
            <OptionItem 
              icon={BiPlusCircle} 
              label="Interested" 
              color="success"
              isDarkMode={isDarkMode}
              onClick={() => {
                onInterestedClick();
                handleClose();
              }}
            />
            <OptionItem 
              icon={BiMinusCircle} 
              label="Not interested" 
              color="warning"
              isDarkMode={isDarkMode}
              onClick={() => {
                onNotInterestedClick();
                handleClose();
              }}
            />
            <OptionItem 
              icon={BiFlag} 
              label="Report" 
              color="danger"
              isDarkMode={isDarkMode}
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
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    onEditClick();
                    // handleClose();
                  }}
                />
                <OptionItem 
                  icon={BiTrash} 
                  label="Delete" 
                  color="danger"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    setShowDeleteConfirm(true);
                  }}
                />
              </>
            )}
          </ActionRow>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className={`w-full max-w-[320px] rounded-[24px] p-6 text-center shadow-2xl animate-in zoom-in duration-200 border ${
              isDarkMode 
                ? 'bg-[#1e2030]/95 text-white border-white/10' 
                : 'bg-white text-black border-black/10'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-4">
              <BiTrash size={28} className="animate-pulse" />
            </div>
            
            <h3 className="text-[17px] font-bold tracking-tight">Delete this Reel?</h3>
            <p className="mt-2 text-xs opacity-50 leading-relaxed px-2">
              This action is permanent and cannot be undone. The video will be removed from your profile and feed immediately.
            </p>
            
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteClick();
                  setShowDeleteConfirm(false);
                  handleClose();
                }}
                className="w-full bg-[#fe2c55] text-white py-3 rounded-full font-bold text-[14px] active:scale-95 transition-all shadow-lg shadow-[#fe2c55]/20"
              >
                Delete Reel
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={`w-full py-3 rounded-full font-bold text-[14px] active:scale-95 transition-all ${
                  isDarkMode 
                    ? 'bg-white/5 text-white hover:bg-white/10' 
                    : 'bg-black/5 text-black hover:bg-black/10'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoreOptionsSheet;
