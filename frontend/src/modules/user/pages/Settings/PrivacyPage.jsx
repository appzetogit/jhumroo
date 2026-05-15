import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight, BiLock, BiAt, BiCommentDetail, BiArrowFromBottom, BiEnvelope, BiDownload, BiListUl } from 'react-icons/bi';
import { getPrivacySettings, togglePrivateAccount } from '../../../../utils/privacySettings';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { config } = useAppContent();
    const { user: currentUser, updateUser } = useAuth();
    const [privacySettings, setPrivacySettings] = useState(() => getPrivacySettings());
    const [isUpdating, setIsUpdating] = useState(false);
    const iconMap = {
      comments: BiCommentDetail,
      mentions: BiAt,
      messages: BiEnvelope,
      duet: BiArrowFromBottom,
      stitch: BiArrowFromBottom,
      downloads: BiDownload,
      blocked: BiListUl,
      lock: BiLock,
    };
    const formatPrivacyValue = (val) => {
      if (!val) return val;
      if (typeof val !== 'string') return val;
      if (val === 'no_one') return 'No one';
      return val.charAt(0).toUpperCase() + val.slice(1);
    };

    const privacySections = (config?.settings?.privacySections || []).map((section) => ({
      ...section,
      items: (section.items || []).map((item) => {
        const Icon = item.icon ? iconMap[item.icon] : null;
        let displayValue = item.value ? privacySettings[item.value] : item.value;

        // Override with real user data if available
        if (item.value === 'comments' && currentUser?.commentPrivacy) {
          displayValue = formatPrivacyValue(currentUser.commentPrivacy);
        } else if (item.value === 'mentionsTags' && currentUser?.mentionPrivacy) {
          displayValue = formatPrivacyValue(currentUser.mentionPrivacy);
        } else if (item.value === 'directMessages' && currentUser?.messagePrivacy) {
          displayValue = formatPrivacyValue(currentUser.messagePrivacy);
        } else if (item.value === 'downloads' && currentUser?.downloadPrivacy) {
          displayValue = formatPrivacyValue(currentUser.downloadPrivacy);
        }

        return {
          ...item,
          icon: Icon ? <Icon size={20} className={item.icon === 'stitch' ? 'rotate-90' : ''} /> : null,
          value: displayValue,
        };
      }),
    }));

    const handleItemClick = async (item) => {
        if (item.isToggle) {
            if (isUpdating) return;
            setIsUpdating(true);
            try {
              const newIsPrivate = !currentUser?.isPrivate;
              const res = await userService.updateProfile({ isPrivate: newIsPrivate });
              if (res.success) {
                updateUser(res.user);
              }
            } catch (err) {
              console.error('Failed to update private account setting:', err);
            } finally {
              setIsUpdating(false);
            }
            return;
        }

        if (item.route) {
            navigate(item.route);
        }
    };

    return (
        <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
            {/* Header */}
            <div className="theme-page-header flex items-center justify-between px-4 pt-6 pb-6 shrink-0 relative">
                <div 
                  className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
                  onClick={() => navigate(-1)}
                >
                    <BiChevronLeft size={24} className="theme-text-primary" />
                </div>
                <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">Privacy</h2>
                <div className="w-10"></div>
            </div>

            <div className="scrollable flex-1 px-4 pb-24 pt-6">
                {privacySections.map((section, idx) => (
                    <div key={idx} className="mb-8">
                        <h4 className="theme-section-title text-[11px] font-bold uppercase tracking-widest mb-3 ml-1">{section.title}</h4>
                        <div className="theme-panel-card rounded-[18px] overflow-hidden shadow-sm">
                            {section.items.map((item, itemIdx) => {
                                const isLast = itemIdx === section.items.length - 1;
                                return (
                                    <div 
                                        key={itemIdx} 
                                        className={`theme-panel-row flex justify-between items-center p-4 transition-colors cursor-pointer ${!isLast ? 'border-b theme-panel-divider' : ''}`}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="flex items-center gap-3.5 theme-text-primary">
                                            <div className="opacity-70">{item.icon}</div>
                                            <span className="text-[15px] font-medium tracking-wide">{item.label}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {item.value && <span className="theme-text-faint text-[14px]">{item.value}</span>}
                                            {item.isToggle ? (
                                                <div className={`w-[46px] h-6 rounded-full flex items-center shrink-0 transition-colors duration-300 ${
                                                  currentUser?.isPrivate
                                                    ? 'bg-[#FE2C55]'
                                                    : isDarkMode
                                                      ? 'bg-transparent border border-white/20'
                                                      : 'bg-black/[0.08] border border-black/10'
                                                }`}>
                                                    <div className={`w-[18px] h-[18px] rounded-full shadow-sm transform transition-transform duration-300 ${
                                                      currentUser?.isPrivate
                                                        ? 'translate-x-[24px] bg-white'
                                                        : isDarkMode
                                                          ? 'translate-x-[2px] bg-white'
                                                          : 'translate-x-[2px] bg-white border border-black/10 shadow-[0_1px_3px_rgba(15,23,42,0.14)]'
                                                    }`}></div>
                                                </div>
                                            ) : (
                                                <BiChevronRight size={22} className="theme-text-faint" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PrivacyPage;
