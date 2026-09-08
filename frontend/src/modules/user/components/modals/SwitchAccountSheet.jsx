import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiX, BiPlus } from 'react-icons/bi';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';

const SwitchAccountSheet = ({ isOpen, onClose, onAddAccount }) => {
  const navigate = useNavigate();
  const { user: currentUser, accounts, switchAccount } = useAuth();
  const { isDarkMode } = useTheme();
  const [isClosing, setIsClosing] = useState(false);
  const startYRef = useRef(null);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ switchAccountOpen: true }, '');

    const handlePopState = () => {
      onClose();
      setCurrentY(0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      setCurrentY(0);
      if (window.history.state?.switchAccountOpen) {
        window.history.back();
      }
    }, 200);
  };

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!startYRef.current) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      setCurrentY(diff);
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

  if (!isOpen) return null;

  // Build unique deduplicated accounts list
  const currentUserId = currentUser?._id || currentUser?.id;
  const currentUsername = currentUser?.username;

  const rawAccounts = accounts && accounts.length > 0 
    ? accounts 
    : (currentUser ? [{ user: currentUser, token: '' }] : []);

  const seenIds = new Set();
  const displayAccounts = [];
  for (const acc of rawAccounts) {
    const accUser = acc.user;
    if (!accUser) continue;
    const idKey = accUser._id ? String(accUser._id) : (accUser.id ? String(accUser.id) : null);
    const usernameKey = accUser.username ? `u:${accUser.username}` : null;
    const phoneKey = accUser.phoneNumber ? `p:${accUser.phoneNumber}` : null;

    const isDuplicate = 
      (idKey && seenIds.has(idKey)) || 
      (usernameKey && seenIds.has(usernameKey)) || 
      (phoneKey && seenIds.has(phoneKey));

    if (!isDuplicate) {
      if (idKey) seenIds.add(idKey);
      if (usernameKey) seenIds.add(usernameKey);
      if (phoneKey) seenIds.add(phoneKey);
      displayAccounts.push(acc);
    }
  }

  // Ensure current user is present
  const hasCurrent = displayAccounts.some(acc => {
    const u = acc.user;
    return u && (
      (currentUserId && (u._id === currentUserId || u.id === currentUserId)) ||
      (currentUsername && u.username === currentUsername)
    );
  });
  if (!hasCurrent && currentUser) {
    displayAccounts.unshift({ user: currentUser, token: '' });
  }

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${currentY}px)` }}
        className={`relative w-full max-h-[85vh] rounded-t-[24px] z-10 flex flex-col transition-all duration-200 shadow-2xl ${
          isDarkMode ? 'bg-[#181818] text-white border-t border-white/10' : 'bg-white text-black border-t border-gray-100'
        } ${isClosing ? 'translate-y-full' : 'animate-slide-up'}`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 relative">
          <div className="w-8" />
          <h2 className="text-[17px] font-bold text-center flex-1">
            Switch account
          </h2>
          <button 
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition-all"
          >
            <BiX size={24} />
          </button>
        </div>

        {/* Accounts List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1 max-h-[50vh]">
          {displayAccounts.map((acc, index) => {
            const accUser = acc.user || {};
            const accId = accUser._id || accUser.id;
            const isActive = (currentUserId && (accId === currentUserId || accUser._id === currentUserId)) || 
                             (currentUsername && accUser.username === currentUsername);
            const avatarUrl = accUser.profilePicture?.url || 
              (typeof accUser.profilePicture === 'string' ? accUser.profilePicture : null) || 
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${accUser.username || index}`;

            return (
              <button
                key={accId || index}
                type="button"
                onClick={() => {
                  if (!isActive && accId) {
                    switchAccount(accId);
                    navigate('/profile');
                  }
                  onClose();
                  if (window.history.state?.switchAccountOpen) {
                    window.history.back();
                  }
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                  isActive 
                    ? isDarkMode ? 'bg-white/10' : 'bg-gray-100' 
                    : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black/20">
                    <img 
                      src={avatarUrl} 
                      alt={accUser.username || 'user'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <span className="text-[15px] font-bold truncate max-w-[220px]">
                    {accUser.username || 'user'}
                  </span>
                </div>

                {isActive && (
                  <div className="w-6 h-6 flex items-center justify-center text-[#FE2C55] shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}

          {/* Add Account Option */}
          <button
            type="button"
            onClick={() => {
              handleClose();
              setTimeout(() => {
                onAddAccount?.();
              }, 220);
            }}
            className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] mt-1 ${
              isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
              isDarkMode ? 'bg-white/10 border-white/15 text-white' : 'bg-gray-100 border-gray-200 text-gray-800'
            }`}>
              <BiPlus size={24} />
            </div>
            <span className="text-[15px] font-bold">
              Add account
            </span>
          </button>
        </div>

        <div className="h-6" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  );
};

export default SwitchAccountSheet;
