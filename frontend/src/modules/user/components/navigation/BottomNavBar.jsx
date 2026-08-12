import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import messageService from '../../../../services/messageService';

// TikTok SVG Icon Components
const HomeIcon = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive ? "0" : "3.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M24 4L4 20v22a2 2 0 002 2h12V30h12v14h12a2 2 0 002-2V20L24 4z" fill={isActive ? "currentColor" : "none"} />
  </svg>
);

const FriendsIcon = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive ? "0" : "3.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 22a8 8 0 100-16 8 8 0 000 16zm16 2a6 6 0 100-12 6 6 0 000 12zm-16 4c-7.3 0-14 3.7-14 9v3h28v-3c0-5.3-6.7-9-14-9zm16 2c-1.8 0-3.9.4-5.9 1.1 2.4 1.8 3.9 4.4 3.9 7.4v2.5H44V36c0-4.3-5.4-7-12-7z" fill={isActive ? "currentColor" : "none"} />
  </svg>
);

const InboxIcon = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive ? "0" : "3.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M42 10H6a2 2 0 00-2 2v24a2 2 0 002 2h36a2 2 0 002-2V12a2 2 0 00-2-2zm-3 10H29a5 5 0 01-10 0H9V14h30v6z" fill={isActive ? "currentColor" : "none"} />
  </svg>
);

const ProfileIcon = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive ? "0" : "3.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M24 22a9 9 0 100-18 9 9 0 000 18zm0 4c-9.3 0-18 4.7-18 11v3h36v-3c0-6.3-8.7-11-18-11z" fill={isActive ? "currentColor" : "none"} />
  </svg>
);

const customIconMap = {
  home: HomeIcon,
  search: FriendsIcon,
  friends: FriendsIcon,
  inbox: InboxIcon,
  user: ProfileIcon,
  profile: ProfileIcon,
};

const NavItem = ({ item, isActive, isDarkMode }) => {
  if (item.type === 'create') {
    return (
      <NavLink to={item.path} className="flex-1 flex flex-col items-center justify-center transition-transform active:scale-95 duration-150 select-none">
        <div className="relative w-[46px] h-[28px] flex items-center justify-center">
          <div className="absolute left-0 w-[38px] h-full bg-[#25F4EE] rounded-[8px] z-[1]" />
          <div className="absolute right-0 w-[38px] h-full bg-[#FE2C55] rounded-[8px] z-[1]" />
          <div className="absolute w-[38px] h-full bg-white rounded-[8px] z-[2] flex items-center justify-center shadow-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>
      </NavLink>
    );
  }

  const IconComponent = item.icon || HomeIcon;
  const displayLabel = item.path === '/search' ? 'Friends' : item.label;

  return (
    <NavLink
      to={item.path}
      className={`flex-1 flex flex-col items-center justify-center py-0.5 transition-opacity group select-none ${
        !isActive ? 'active:opacity-70' : ''
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className={`transition-all duration-200 ${isActive ? 'text-white scale-105' : 'text-white/60 group-hover:text-white/90'}`}>
          <IconComponent isActive={isActive} />
        </div>

        {/* Badge or Red dot */}
        {item.badge ? (
          <span className="absolute -top-1 -right-2.5 bg-[#FE2C55] text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-black z-10">
            {item.badge}
          </span>
        ) : item.path === '/search' ? (
          <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-[#FE2C55] rounded-full border border-black z-10" />
        ) : null}
      </div>

      <span
        className={`text-[10px] mt-0.5 font-semibold transition-all duration-200 ${
          isActive ? 'text-white font-bold' : 'text-white/60'
        }`}
      >
        {displayLabel}
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

  // Watch for active full-screen modal sheets
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
    if (!user || user.isBanned) return;
    try {
      const res = await messageService.getConversations();
      if (res.success) {
        const count = res.conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
        setUnreadCount(count);
      }
    } catch (err) {
      if (!user?.isBanned) {
        console.error('Failed to fetch unread count:', err);
      }
    }
  };

  useEffect(() => {
    if (user && !user.isBanned) {
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (socket && user && !user.isBanned) {
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
  }, [socket, user]);

  const navItems = useMemo(() => {
    const items = config?.navigation?.bottomNav || [
      { path: '/', label: 'Home', icon: 'home', type: 'link' },
      { path: '/search', label: 'Friends', icon: 'friends', type: 'link' },
      { path: '/create', label: 'Create', type: 'create' },
      { path: '/inbox', label: 'Inbox', icon: 'inbox', type: 'link' },
      { path: '/profile', label: 'Profile', icon: 'profile', type: 'link' },
    ];
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
            ? customIconMap[item.icon] || HomeIcon
            : item.icon || HomeIcon,
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

  if (isModalOpen || isKeyboardOpen) return null;

  return (
    <nav
      className="fixed min-[600px]:absolute left-0 w-full z-[1000] flex justify-around items-center bg-black border-t border-white/10 text-white shadow-2xl transition-all duration-300"
      style={{
        bottom: '0px',
        height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) * 0.5)',
      }}
    >
      {/* Nav Items */}
      {navItems.map((item, index) => (
        <NavItem
          key={item.path}
          item={item}
          isActive={activeIndex === index}
          isDarkMode={true}
        />
      ))}
    </nav>
  );
};

export default BottomNavBar;
