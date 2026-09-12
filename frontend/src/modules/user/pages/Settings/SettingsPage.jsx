import React, { useState } from 'react';
import { BiChevronLeft, BiChevronRight, BiUser, BiLockAlt, BiShieldAlt, BiBell, BiMoon, BiGlobe, BiQuestionMark, BiLogOut, BiFile, BiTrash, BiSupport, BiHelpCircle, BiPulse } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { userService } from '../../../../services';

const SettingsPage = ({ onLogout }) => {
    const navigate = useNavigate();
    const { user: currentUser, logout: performLogout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const { config } = useAppContent();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const iconMap = {
      user: BiUser,
      lock: BiLockAlt,
      shield: BiShieldAlt,
      bell: BiBell,
      moon: BiMoon,
      globe: BiGlobe,
      activity: BiPulse,
      help: BiQuestionMark,
      helpCircle: BiHelpCircle,
      support: BiSupport,
      logout: BiLogOut,
      file: BiFile,
      trash: BiTrash,
    };

    const sections = (config?.settings?.sections || []).map((section) => {
      let items = section.items || [];
      const logoutIndex = items.findIndex(item => item.isLogout);
      if (logoutIndex !== -1 && !items.some(item => item.isDeleteAccount)) {
        items = [
          ...items.slice(0, logoutIndex + 1),
          { icon: 'trash', label: 'Delete Account', color: '#FF3B30', isDeleteAccount: true },
          ...items.slice(logoutIndex + 1)
        ];
      }
      return {
        ...section,
        items: items.map((item) => {
          let iconKey = item.icon;
          if (item.label === 'Support' && iconKey === 'help') {
            iconKey = 'support';
          }
          if (item.label === 'Help Center' && iconKey === 'help') {
            iconKey = 'helpCircle';
          }
          const Icon = iconKey ? iconMap[iconKey] : null;
          return {
            ...item,
            label: item.isToggle ? (isDarkMode ? 'Dark mode' : 'Light mode') : item.label,
            icon: Icon ? <Icon size={20} /> : null,
          };
        }),
      };
    });

    const handleItemClick = (item) => {
        if (item.isToggle) {
            toggleTheme();
        } else if (item.isLogout) {
            setShowLogoutModal(true);
        } else if (item.isDeleteAccount) {
            setShowDeleteModal(true);
        } else if (item.route) {
            navigate(item.route);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setIsDeleting(true);
            await userService.deleteAccount();
            setShowDeleteModal(false);
            performLogout();
        } catch (error) {
            console.error('[Settings] Delete account failed:', error);
            alert(error?.response?.data?.message || error?.message || 'Failed to delete account. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 relative">
                <div 
                  className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
                  onClick={() => navigate(-1)}
                >
                    <BiChevronLeft size={24} className="theme-text-primary opacity-80" />
                </div>
                <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">Settings and privacy</h2>
                <div className="w-10"></div>
            </div>

            <div className={`scrollable flex-1 px-4 pb-8 ${showLogoutModal ? 'overflow-hidden' : ''}`}>
                {/* User Profile Section */}
                <div 
                  className="theme-panel-card rounded-[18px] p-4 flex items-center justify-between mb-3 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black/20">
                            <img 
                              src={currentUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}&style=circle`} 
                              alt={currentUser?.username} 
                              className="w-full h-full object-cover scale-110" 
                            />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="theme-text-primary text-[15px] font-bold mb-0.5">{currentUser?.fullName || 'User'}</h3>
                            <p className="theme-text-muted text-[13px] font-medium">@{currentUser?.username}</p>
                        </div>
                    </div>
                </div>

                {/* Upgrade to Premium Card */}
                <div 
                  onClick={() => navigate('/profile/premium')}
                  className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-[18px] p-4 text-white flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all border border-white/20 hover:brightness-105 mb-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-md">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="22" 
                        height="22" 
                        viewBox="0 0 24 24" 
                        fill="currentColor" 
                        className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] animate-pulse"
                      >
                        <path d="M2 19h20v2H2zm1-4h18v2H3zm9-12.2L16.2 8l4.8-4.8L19 13.8H5L3 3.2 7.8 8z"/>
                      </svg>
                    </div>
                    <div className="text-left text-white">
                      <h4 className="text-[14px] font-bold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] flex items-center gap-1.5 leading-tight text-white">
                        Upgrade to Premium
                        <span className="bg-white/30 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider border border-white/20 text-white">PRO</span>
                      </h4>
                      <p className="text-[11px] text-white/90 font-medium mt-0.5 text-white/90">Get verified crown, ultra HD uploads & more!</p>
                    </div>
                  </div>
                  
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="text-white"
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                    {sections.map((section, idx) => (
                        <div key={idx} className="theme-panel-card rounded-[18px] overflow-hidden shadow-sm">
                            {section.items.map((item, itemIdx) => {
                                const isLast = itemIdx === section.items.length - 1;
                                return (
                                    <div 
                                        key={itemIdx} 
                                        className={`theme-panel-row flex justify-between items-center p-4 transition-colors cursor-pointer ${!isLast ? 'border-b theme-panel-divider' : ''}`}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="flex items-center gap-3.5 theme-text-primary" style={item.color ? { color: item.color } : {}}>
                                            <div className="opacity-90">{item.icon}</div>
                                            <span className="text-[15px] font-medium tracking-wide">{item.label}</span>
                                        </div>
                                        
                                        {item.isToggle ? (
                                            <div className={`w-[46px] h-6 rounded-full flex items-center shrink-0 transition-colors duration-300 ${
                                              isDarkMode
                                                ? 'bg-[#FE2C55]/12 border border-white/35'
                                                : 'bg-black/[0.08] border border-black/12'
                                            }`}>
                                                <div className={`w-[18px] h-[18px] rounded-full transform transition-transform duration-300 ${
                                                  isDarkMode
                                                    ? 'translate-x-[24px] bg-white shadow-sm'
                                                    : 'translate-x-[2px] bg-white border border-black/10 shadow-[0_1px_3px_rgba(15,23,42,0.16)]'
                                                }`}></div>
                                            </div>
                                        ) : (
                                            <BiChevronRight size={22} className="theme-text-faint" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {showLogoutModal && (
                <div
                  className="absolute inset-0 z-[1200] flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
                  onClick={() => setShowLogoutModal(false)}
                >
                    <div
                      className={`w-full rounded-t-[24px] rounded-b-none overflow-hidden shadow-2xl animate-slide-up ${
                        isDarkMode ? 'bg-[#1b1f31] border-t border-white/10' : 'bg-white border-t border-black/[0.08]'
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                        <div className="px-6 pt-7 pb-5 text-center">
                            <h3 className={`text-[18px] font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>Log out?</h3>
                            <p className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-white/55' : 'text-black/55'}`}>
                                You will be returned to the welcome screen and can sign in again anytime.
                            </p>
                        </div>

                        <div className={`h-px ${isDarkMode ? 'bg-white/8' : 'bg-black/[0.08]'}`} />

                        <div className="flex px-4 pt-4 pb-8 gap-3">
                            <button
                              type="button"
                              onClick={() => setShowLogoutModal(false)}
                              className={`flex-1 min-h-[52px] rounded-[14px] border text-[15px] font-semibold transition-all active:scale-[0.98] ${
                                isDarkMode
                                  ? 'border-white/12 bg-white/6 text-white/75 active:bg-white/10'
                                  : 'border-[#d1d5db] bg-[#f7f8fb] text-black/65 active:bg-black/[0.04]'
                              }`}
                            >
                                Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowLogoutModal(false);
                                onLogout?.();
                              }}
                              className="flex-1 min-h-[52px] rounded-[14px] text-[15px] font-bold text-white transition-all active:scale-[0.98] active:brightness-95"
                              style={{
                                background: 'linear-gradient(180deg, #ff4d73 0%, #FE2C55 100%)',
                                boxShadow: '0 12px 24px rgba(254, 44, 85, 0.22)',
                              }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div
                  className="absolute inset-0 z-[1200] flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
                  onClick={() => !isDeleting && setShowDeleteModal(false)}
                >
                    <div
                      className={`w-full rounded-t-[24px] rounded-b-none overflow-hidden shadow-2xl animate-slide-up ${
                        isDarkMode ? 'bg-[#1b1f31] border-t border-white/10' : 'bg-white border-t border-black/[0.08]'
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                        <div className="px-6 pt-7 pb-5 text-center">
                            <h3 className={`text-[18px] font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-[#FF3B30]'}`}>Delete account?</h3>
                            <p className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-white/55' : 'text-black/55'}`}>
                                This will permanently delete your profile, reels, comments, and all account data. This action is irreversible.
                            </p>
                        </div>

                        <div className={`h-px ${isDarkMode ? 'bg-white/8' : 'bg-black/[0.08]'}`} />

                        <div className="flex px-4 pt-4 pb-8 gap-3">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => setShowDeleteModal(false)}
                              className={`flex-1 min-h-[52px] rounded-[14px] border text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
                                isDarkMode
                                  ? 'border-white/12 bg-white/6 text-white/75 active:bg-white/10'
                                  : 'border-[#d1d5db] bg-[#f7f8fb] text-black/65 active:bg-black/[0.04]'
                              }`}
                            >
                                Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={handleDeleteAccount}
                              className="flex-1 min-h-[52px] rounded-[14px] text-[15px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                              style={{
                                background: 'linear-gradient(180deg, #ff4d55 0%, #FF3B30 100%)',
                                boxShadow: '0 12px 24px rgba(255, 59, 48, 0.22)',
                              }}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
