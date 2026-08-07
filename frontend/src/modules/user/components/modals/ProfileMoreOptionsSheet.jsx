import React, { useState, useRef, useEffect } from 'react';
import { 
  BiBlock, 
  BiFlag, 
  BiInfoCircle, 
  BiShareAlt, 
  BiMessageDetail,
  BiChevronRight,
  BiArrowBack,
  BiCalendar,
  BiCheckCircle,
  BiMap
} from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';

const BubbleOptionItem = ({ icon: Icon, label, onClick, color, isActive, isDarkMode }) => (
  <button 
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="flex flex-col items-center gap-1.5 min-w-[60px] active:scale-90 transition-all cursor-pointer"
  >
    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
      isActive 
        ? 'bg-red-500 text-white' 
        : color === 'danger'
          ? isDarkMode ? 'bg-red-500/20 text-red-500' : 'bg-red-50 text-red-600'
          : isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-gray-800'
    }`}>
      <Icon />
    </div>
    <span className={`text-[11px] font-semibold tracking-tight ${
      color === 'danger' 
        ? 'text-red-500' 
        : isDarkMode ? 'text-white/80' : 'text-gray-700'
    }`}>{label}</span>
  </button>
);

const OptionItem = ({ icon: Icon, label, onClick, color = 'default', subLabel, showArrow = false, isDarkMode }) => (
  <button 
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`w-full flex items-center px-3.5 py-3 gap-4 transition-all rounded-xl active:scale-[0.99] cursor-pointer ${
      color === 'danger'
        ? isDarkMode ? 'hover:bg-red-500/10 active:bg-red-500/20 text-red-500' : 'hover:bg-red-50 active:bg-red-100 text-red-600'
        : isDarkMode ? 'hover:bg-white/5 active:bg-white/10 text-white/90' : 'hover:bg-black/5 active:bg-black/10 text-gray-900'
    }`}
  >
    <div className={`text-2xl flex items-center justify-center shrink-0 ${
      color === 'danger' ? 'text-red-500' : isDarkMode ? 'text-white/80' : 'text-gray-700'
    }`}>
      <Icon />
    </div>
    <div className="flex flex-col items-start flex-1 min-w-0">
      <span className={`text-[15px] font-bold tracking-tight ${
        color === 'danger' ? 'text-red-500' : isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>{label}</span>
      {subLabel && (
        <span className={`text-[12px] opacity-50 font-medium ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
          {subLabel}
        </span>
      )}
    </div>
    {showArrow && (
      <BiChevronRight size={20} className={isDarkMode ? 'text-white/40' : 'text-black/40'} />
    )}
  </button>
);

const ProfileMoreOptionsSheet = ({ 
  isOpen, 
  onClose, 
  profile,
  isBlocked,
  onBlockToggle,
  onReportClick,
  onShareClick,
  onMessageClick
}) => {
  const { isDarkMode } = useTheme();
  const [view, setView] = useState('menu'); // 'menu' or 'about'
  const [isClosing, setIsClosing] = useState(false);
  const startYRef = useRef(null);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setView('menu');
      setCurrentY(0);
      document.body.style.overflow = 'hidden';
      const scrollables = document.querySelectorAll('.scrollable');
      scrollables.forEach(el => {
        el.style.overflow = 'hidden';
      });
    } else {
      document.body.style.overflow = '';
      const scrollables = document.querySelectorAll('.scrollable');
      scrollables.forEach(el => {
        el.style.overflow = '';
      });
    }

    return () => {
      document.body.style.overflow = '';
      const scrollables = document.querySelectorAll('.scrollable');
      scrollables.forEach(el => {
        el.style.overflow = '';
      });
    };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;
  if (!profile) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setView('menu');
      setCurrentY(0);
    }, 250);
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
    if (currentY > 80) {
      handleClose();
    } else {
      setCurrentY(0);
    }
    startYRef.current = null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div 
      className={`fixed inset-0 z-[5000] flex flex-col justify-end transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${isDarkMode ? 'bg-black/60 backdrop-blur-xs' : 'bg-black/50 backdrop-blur-xs'}`}
      onClick={handleClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div 
        className={`w-full h-auto max-h-[75vh] shrink-0 rounded-t-[24px] pb-6 pt-2 px-3 transition-all duration-300 ease-out shadow-2xl no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isOpen && !isClosing ? 'translate-y-0' : 'translate-y-full'
        } ${
          isDarkMode 
            ? 'bg-[#161823] text-white border-t border-white/10' 
            : 'bg-white text-gray-900 border-t border-gray-100'
        }`}
        style={{ transform: `translateY(${currentY}px)` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator pill */}
        <div className="flex flex-col items-center pt-1 pb-2">
          <div className={`w-12 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/15'}`} />
        </div>

        <div className="w-full h-auto max-h-[calc(75vh-2rem)] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col">
          {view === 'menu' ? (
            <div className="flex flex-col">
              {/* Quick Action Row (Bubble Icons) */}
              <div className={`flex items-center justify-around py-3 px-1 mb-2 border-b ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <BubbleOptionItem 
                  icon={BiMessageDetail}
                  label="Message"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onMessageClick?.();
                  }}
                />
                <BubbleOptionItem 
                  icon={BiShareAlt}
                  label="Share"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onShareClick?.();
                  }}
                />
                <BubbleOptionItem 
                  icon={BiInfoCircle}
                  label="About"
                  isDarkMode={isDarkMode}
                  onClick={() => setView('about')}
                />
                <BubbleOptionItem 
                  icon={BiBlock}
                  label={isBlocked ? "Unblock" : "Block"}
                  color="danger"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onBlockToggle?.();
                  }}
                />
                <BubbleOptionItem 
                  icon={BiFlag}
                  label="Report"
                  color="danger"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onReportClick?.();
                  }}
                />
              </div>

              {/* Detailed Option List */}
              <div className="flex flex-col gap-1 pt-1 pb-2">
                <OptionItem 
                  icon={BiInfoCircle} 
                  label="About this account"
                  subLabel="Joined date & location info"
                  isDarkMode={isDarkMode}
                  onClick={() => setView('about')}
                  showArrow={true}
                />
                <OptionItem 
                  icon={BiShareAlt} 
                  label="Share this profile" 
                  subLabel="Send profile link to friends"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onShareClick?.();
                  }}
                />
                <OptionItem 
                  icon={BiMessageDetail} 
                  label="Send message" 
                  subLabel={`Direct message @${profile?.username || ''}`}
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onMessageClick?.();
                  }}
                />
                <OptionItem 
                  icon={BiBlock} 
                  label={isBlocked ? `Unblock @${profile?.username || ''}` : `Block @${profile?.username || ''}`} 
                  subLabel={isBlocked ? "Allow interactions again" : "Block account from interacting"}
                  color="danger"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onBlockToggle?.();
                  }}
                />
                <OptionItem 
                  icon={BiFlag} 
                  label="Report account" 
                  subLabel="Report inappropriate profile or behavior"
                  color="danger"
                  isDarkMode={isDarkMode}
                  onClick={() => {
                    handleClose();
                    onReportClick?.();
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col pb-2">
              <div className={`flex items-center px-2 py-2 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'} mb-3`}>
                <button 
                  type="button"
                  onClick={() => setView('menu')}
                  className={`p-2 rounded-full active:scale-95 transition-transform cursor-pointer ${isDarkMode ? 'text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/5'}`}
                >
                  <BiArrowBack size={22} />
                </button>
                <h2 className="flex-1 text-center text-[16px] font-bold mr-8 tracking-tight">About this account</h2>
              </div>
              
              <div className="px-4 py-2 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full mb-2 overflow-hidden border-2 border-white/10 shadow-md">
                  <img 
                    src={profile?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} 
                    alt="profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-base font-bold text-center flex items-center gap-1">
                  {profile?.fullName || profile?.username}
                  {profile?.isVerified && (
                    <span className="text-blue-500 text-sm"><BiCheckCircle /></span>
                  )}
                </h3>
                <p className="text-xs opacity-60 mb-4">@{profile?.username}</p>
                
                <div className={`w-full rounded-xl p-3.5 flex flex-col gap-3 ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg shrink-0">
                      <BiCalendar />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] opacity-60 font-medium">Date joined</span>
                      <span className="text-[13px] font-semibold">{formatDate(profile?.createdAt)}</span>
                    </div>
                  </div>

                  {(profile?.state || profile?.country) && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center text-lg shrink-0">
                        <BiMap />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] opacity-60 font-medium">Account location</span>
                        <span className="text-[13px] font-semibold">
                          {[profile?.state, profile?.country || 'India'].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-lg shrink-0">
                      <BiInfoCircle />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] opacity-60 font-medium">Account status</span>
                      <span className="text-[13px] font-semibold text-emerald-400">Active</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-[11px] opacity-40 mt-4 text-center px-2 leading-relaxed">
                  To help keep our community authentic, we show information about accounts on Jhumroo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileMoreOptionsSheet;
