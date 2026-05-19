import React, { useState } from 'react';
import { 
  BiBlock, 
  BiFlag, 
  BiInfoCircle, 
  BiShareAlt, 
  BiMessageDetail,
  BiChevronRight,
  BiArrowBack,
  BiCalendar
} from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';

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
  const { user: currentUser } = useAuth();
  const [view, setView] = useState('menu'); // 'menu' or 'about'
  const [isClosing, setIsClosing] = useState(false);
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(0);

  if (!isOpen && !isClosing) return null;
  if (!profile) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setView('menu');
      setCurrentY(0);
    }, 300);
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

  const OptionItem = ({ icon: Icon, label, onClick, color, subLabel, showArrow = false }) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center p-4 gap-4 active:bg-black/5 transition-all ${
        isDarkMode ? 'border-b border-white/5 active:bg-white/5' : 'border-b border-black/5 active:bg-black/5'
      }`}
    >
      <div className={`text-2xl flex items-center justify-center ${
        color === 'danger' ? 'text-red-500' : isDarkMode ? 'text-white/90' : 'text-black/80'
      }`}>
        <Icon />
      </div>
      <div className="flex flex-col items-start flex-1">
        <span className={`text-[15px] font-semibold ${
          color === 'danger' ? 'text-red-500' : isDarkMode ? 'text-white/90' : 'text-black/90'
        }`}>{label}</span>
        {subLabel && <span className={`text-[12px] opacity-40 font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{subLabel}</span>}
      </div>
      {showArrow && <BiChevronRight size={20} className="opacity-30" />}
    </button>
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
        <div className="flex flex-col items-center pt-3 pb-2 sticky top-0 z-10 bg-inherit">
          <div className={`w-10 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/10'}`}></div>
        </div>

        {view === 'menu' ? (
          <div className="flex flex-col">
            <h2 className="text-center text-[16px] font-bold py-2">Profile Options</h2>
            <div className="px-2">
              <OptionItem 
                icon={BiBlock} 
                label={isBlocked ? "Unblock" : "Block"} 
                color="danger"
                onClick={onBlockToggle}
              />
              <OptionItem 
                icon={BiFlag} 
                label="Report" 
                color="danger"
                onClick={onReportClick}
              />
              <OptionItem 
                icon={BiInfoCircle} 
                label="About this account" 
                onClick={() => setView('about')}
                showArrow={true}
              />
              <OptionItem 
                icon={BiShareAlt} 
                label="Share this profile" 
                onClick={onShareClick}
              />
              <OptionItem 
                icon={BiMessageDetail} 
                label="Send message" 
                onClick={onMessageClick}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center px-4 py-2">
              <button 
                onClick={() => setView('menu')}
                className="p-2 -ml-2 active:opacity-60"
              >
                <BiArrowBack size={24} />
              </button>
              <h2 className="flex-1 text-center text-[16px] font-bold mr-8">About this account</h2>
            </div>
            
            <div className="px-6 py-4 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full mb-4 overflow-hidden border border-gray-100">
                <img 
                  src={profile?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} 
                  alt="profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-lg font-bold">{profile?.fullName || profile?.username}</h3>
              <p className="text-gray-500 mb-6">@{profile?.username}</p>
              
              <div className={`w-full rounded-2xl p-4 flex flex-col gap-4 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl">
                    <BiCalendar />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-gray-500">Date joined</span>
                    <span className="text-[15px] font-semibold">{formatDate(profile?.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-xl">
                    <BiInfoCircle />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-gray-500">Account status</span>
                    <span className="text-[15px] font-semibold">Active</span>
                  </div>
                </div>
              </div>
              
              <p className="text-[12px] text-gray-400 mt-6 text-center px-4">
                To help keep our community authentic, we show information about accounts on Jhumroo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileMoreOptionsSheet;
