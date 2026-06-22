import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BiHomeAlt, BiSearch, BiMessageSquareDetail, BiUser } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import messageService from '../../../../services/messageService';

const iconMap = {
  home: BiHomeAlt,
  search: BiSearch,
  inbox: BiMessageSquareDetail,
  user: BiUser,
};

const NavItem = ({ item, isActive, isDarkMode }) => {
  if (item.type === 'create') {
    return (
      <NavLink to={item.path} className="flex-1 flex flex-col items-center justify-center transition-transform active:scale-95 duration-200 will-change-transform">
        <div className="relative w-[60px] h-[36px] flex items-center justify-center">
          <div className="absolute left-0 w-[50px] h-full bg-tiktok-cyan rounded-[12px] z-[1]" />
          <div className="absolute right-0 w-[50px] h-full bg-tiktok-red rounded-[12px] z-[1]" />
          <div className="absolute w-[50px] h-full bg-white rounded-[12px] z-[2] flex items-center justify-center shadow-sm">
            <span className="text-black text-[28px] font-bold leading-none mb-[3px]">+</span>
          </div>
        </div>
      </NavLink>
    );
  }

  const Icon = item.icon;
  const SafeIcon = Icon || BiHomeAlt;

  return (
    <NavLink
      to={item.path}
      className={`flex-1 flex flex-col items-center justify-end pb-1 transition-opacity group ${!isActive ? 'active:opacity-70' : ''}`}
    >
      <div
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-transform duration-300 ease-in-out will-change-transform ${isActive ? 'scale-[1.15]' : 'group-active:scale-95'
          }`}
      >
        <SafeIcon
          size={22}
          className={`transition-colors duration-300 ease-in-out ${isActive
              ? 'text-[#FE2C55] drop-shadow-[0_0_8px_rgba(254,44,85,0.4)]'
              : isDarkMode
                ? 'text-white/70'
                : 'text-black/55'
            }`}
        />
        {item.badge && (
          <span className={`absolute top-0 -right-1 bg-tiktok-red text-white text-[10px] font-bold px-1.5 h-3.5 min-w-[14px] rounded-full flex items-center justify-center border border-black z-10 transition-transform duration-300 ${isActive ? 'scale-[0.83]' : 'scale-100'}`}>
            {item.badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] mt-0.5 transition-all duration-300 ease-in-out ${isActive
          ? isDarkMode
            ? 'text-white font-bold opacity-100 drop-shadow-md'
            : 'text-black font-bold opacity-100'
          : isDarkMode
            ? 'text-white/70 opacity-80'
            : 'text-black/55 opacity-90'
        }`}>
        {item.label}
      </span>
    </NavLink>
  );
};

const BottomNavBar = ({ isDarkTheme = true }) => {
  const { isDarkMode } = useTheme();
  const { config } = useAppContent();
  const { user } = useAuth();
  const socket = useSocket();
  const { pathname } = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      const heightDifference = window.screen.height - window.innerHeight;
      const isKeyboardActive = isInputFocused && heightDifference > 150;
      setIsKeyboardOpen(!!isKeyboardActive);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('focusin', handleResize);
    window.addEventListener('focusout', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focusin', handleResize);
      window.removeEventListener('focusout', handleResize);
    };
  }, []);

  const isHomePage = pathname === '/';
  const [isReelOverlayOpen, setIsReelOverlayOpen] = useState(false);

  useEffect(() => {
    const checkReelOverlay = () => {
      const hasOverlay = !!document.querySelector('[data-reel-overlay-open="true"]');
      setIsReelOverlayOpen(hasOverlay);
    };

    checkReelOverlay();

    const observer = new MutationObserver(checkReelOverlay);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-reel-overlay-open']
    });

    return () => observer.disconnect();
  }, []);

  const usesDarkNavAppearance = isDarkMode || isHomePage;

  // Watch for active full-screen modal sheets in Jhumroo
  useEffect(() => {
    const checkModal = () => {
      const hasOpenSheet = !!document.querySelector('[data-modal-open="true"]');
      setIsModalOpen(hasOpenSheet);
    };

    checkModal();

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-modal-open']
    });

    return () => observer.disconnect();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await messageService.getConversations();
      if (res.success) {
        const count = res.conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', () => {
        fetchUnreadCount();
      });
      socket.on('conversation_read', () => {
        fetchUnreadCount();
      });
      return () => {
        socket.off('new_message');
        socket.off('conversation_read');
      };
    }
  }, [socket]);

  const navItems = useMemo(() => {
    const items = config?.navigation?.bottomNav || [];
    return items.map((item) => {
      let badge = item.badge;
      if (item.path === '/inbox' && unreadCount > 0) {
        badge = unreadCount > 99 ? '99+' : unreadCount;
      }
      return {
        ...item,
        badge,
        icon:
          typeof item.icon === 'string'
            ? iconMap[item.icon] || BiHomeAlt
            : item.icon || BiHomeAlt,
      };
    });
  }, [config, unreadCount]);

  useEffect(() => {
    const index = navItems.findIndex(item => {
      if (item.path === '/profile') {
        const isSelfProfile = pathname === '/profile' || (user?.username && pathname === `/user/${user.username}`);
        return isSelfProfile;
      }
      if (item.path === '/') return pathname === '/';
      return pathname.startsWith(item.path);
    });

    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [pathname, navItems]);

  const containerClasses = `absolute left-0 w-full z-[1000] flex justify-around items-stretch transition-all duration-300 ${isHomePage
      ? 'bg-black text-white/90 border-t border-white/10 shadow-[0_-5px_15px_rgba(0,0,0,0.45)]'
      : isDarkTheme && isDarkMode
        ? 'bg-black/85 backdrop-blur-md border-t border-white/10 text-white/70 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]'
        : isDarkMode
          ? 'bg-black text-white/90'
          : 'theme-bottom-nav bg-white text-black/80 border-t border-black/10 shadow-[0_-5px_18px_rgba(15,23,42,0.08)]'
    }`;
  const navCount = navItems.length || 5;

  if (isModalOpen || isKeyboardOpen) return null;

  return (
    <nav
      className={containerClasses}
      style={{
        bottom: '-1px',
        minHeight: 'calc(var(--bottom-nav-height) + calc(env(safe-area-inset-bottom, 0px) * 0.35))',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) * 0.35)',
      }}
    >
      {/* Sliding Tab Indicator */}
      <div
        className="absolute top-0 left-0 h-[3px] flex justify-center transition-transform duration-300 ease-in-out will-change-transform z-10"
        style={{ transform: `translateX(${activeIndex * 100}%)`, width: `${100 / navCount}%` }}
      >
        <div className={`w-[20px] h-full rounded-b-full transition-all duration-300 ease-in-out ${activeIndex === 2
            ? 'opacity-0 scale-0'
            : 'opacity-100 scale-100 bg-[#FE2C55] shadow-[0_2px_8px_rgba(254,44,85,0.8)]'
          }`} />
      </div>

      {/* Nav Items */}
      {navItems.map((item, index) => (
        <NavItem
          key={item.path}
          item={item}
          isActive={activeIndex === index}
          isDarkMode={usesDarkNavAppearance}
        />
      ))}
    </nav>
  );
};

export default BottomNavBar;
