import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import { useTheme } from '../../../../context/ThemeContext';
import userService from '../../../../services/userService';

const OPTIONS = [
  {
    id: 'public',
    title: 'Public',
    description: "Anyone on Jhumroo can see your activity status."
  },
  {
    id: 'friends',
    title: 'Friends',
    description: "Followers you follow back can see your activity status. You'll see each other's activity status only if both of you set it to public or friends."
  },
  {
    id: 'no_one',
    title: 'No one',
    description: "No one can see your activity status, but you can see the activity status of users who set it to public."
  }
];

const ActiveStatusSheet = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { isDarkMode } = useTheme();
  const socket = useSocket();

  const [selectedSetting, setSelectedSetting] = useState(user?.activeStatusPrivacy || 'friends');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user?.activeStatusPrivacy) {
      setSelectedSetting(user.activeStatusPrivacy);
    }
  }, [user?.activeStatusPrivacy]);

  if (!isOpen) return null;

  const handleSelect = async (optionId) => {
    setSelectedSetting(optionId);
    setUpdating(true);
    try {
      const response = await userService.updateProfile({ activeStatusPrivacy: optionId });
      if (response.success && response.user) {
        updateUser(response.user);
      }
      if (socket) {
        socket.emit('update_active_status_privacy', { activeStatusPrivacy: optionId });
      }
    } catch (error) {
      console.error('Failed to update active status privacy:', error);
      if (user?.activeStatusPrivacy) {
        setSelectedSetting(user.activeStatusPrivacy);
      }
    } finally {
      setUpdating(false);
    }
  };

  const isDotActive = selectedSetting !== 'no_one';

  return (
    <div
      className={`fixed inset-0 z-[6000] flex flex-col justify-end transition-opacity duration-300 animate-fadeIn ${
        isDarkMode ? 'bg-black/60 backdrop-blur-xs' : 'bg-black/40 backdrop-blur-xs'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full rounded-t-[28px] px-5 pt-5 pb-8 shadow-2xl transition-transform duration-300 max-w-md mx-auto relative border-t ${
          isDarkMode
            ? 'bg-[#18181a] text-white border-white/10'
            : 'bg-white text-gray-900 border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors active:scale-90 ${
            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-800'
          }`}
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Profile Avatar Header */}
        <div className="flex flex-col items-center mt-2 mb-6">
          <div className="relative w-20 h-20 mb-4">
            <img
              src={
                user?.profilePicture?.url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}`
              }
              alt={user?.username || 'User'}
              className={`w-full h-full rounded-full object-cover shadow-lg ${
                isDarkMode ? 'border-2 border-white/10 bg-[#242424]' : 'border-2 border-gray-200 bg-gray-100'
              }`}
            />
            <span
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 shadow-md transition-colors duration-300 ${
                isDarkMode ? 'border-[#18181a]' : 'border-white'
              } ${
                isDotActive ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]' : 'bg-gray-400'
              }`}
            />
          </div>

          <h2 className={`text-[20px] font-extrabold text-center px-4 leading-tight tracking-tight ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Choose who can see when you're active
          </h2>
        </div>

        {/* Options List Container */}
        <div className={`rounded-[20px] overflow-hidden border ${
          isDarkMode
            ? 'bg-[#242426] border-white/5'
            : 'bg-[#F8F8F8] border-gray-200/60'
        }`}>
          {OPTIONS.map((option, index) => {
            const isSelected = selectedSetting === option.id;
            const isLast = index === OPTIONS.length - 1;
            return (
              <div
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`flex items-start justify-between gap-4 px-5 py-4 cursor-pointer transition-colors duration-150 ${
                  !isLast ? (isDarkMode ? 'border-b border-white/5' : 'border-b border-gray-200/60') : ''
                } ${
                  isDarkMode ? 'active:bg-white/5' : 'active:bg-black/5'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className={`text-[16px] font-bold mb-0.5 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {option.title}
                  </h3>
                  <p className={`text-[12.5px] font-normal leading-relaxed ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {option.description}
                  </p>
                </div>

                {/* Radio Indicator */}
                <div className="mt-1 shrink-0">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-[#FE2C55] flex items-center justify-center shadow-sm animate-scaleIn">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full border-2 transition-colors ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-300'
                    }`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActiveStatusSheet;
