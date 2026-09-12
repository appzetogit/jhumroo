import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useAppContent } from '../../../../hooks/useAppContent';
import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import messageService from '../../../../services/messageService';

// TikTok SVG Icon Components
const HomeIcon = ({ isActive }) => (
  <svg width="25" height="25" viewBox="0 0 48 48" fill="currentColor">
    {isActive ? (
      <path d="M24 5L5 20.5h4.5V43h10.5V31h8v12h10.5V20.5H43L24 5z" />
    ) : (
      <path d="M24 5.5L6 20.5h4v21.5h9.5V31h9v11H38V20.5h4L24 5.5z" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const FriendsIcon = ({ isActive }) => (
  <svg width="25" height="25" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="14" r="7" fill={isActive ? "currentColor" : "none"} />
    <path d="M6 38c0-5.5 4.5-10 10-10s10 4.5 10 10" fill={isActive ? "currentColor" : "none"} />
    <circle cx="32" cy="17" r="5.5" fill={isActive ? "currentColor" : "none"} />
    <path d="M26 36c.5-4 3.5-7 7.5-7s7 3 7.5 7" fill={isActive ? "currentColor" : "none"} />
  </svg>
);

const InboxIcon = ({ isActive }) => (
  <svg width="25" height="25" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M40 8H8a4 4 0 00-4 4v20a4 4 0 004 4h4v6l8-6h20a4 4 0 004-4V12a4 4 0 00-4-4z" fill={isActive ? "currentColor" : "none"} />
    <line x1="18" y1="22" x2="30" y2="22" stroke={isActive ? "#000" : "currentColor"} strokeWidth="3.6" />
  </svg>
);

const ProfileIcon = ({ isActive }) => (
  <svg width="25" height="25" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="24" cy="14" r="7.5" fill={isActive ? "currentColor" : "none"} />
    <path d="M8 39c0-8.5 7.2-15 16-15s16 6.5 16 15" fill={isActive ? "currentColor" : "none"} />
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
      <NavLink to={item.path} className="flex-1 flex flex-col items-center justify-center -translate-y-0.5 transition-transform active:scale-95 duration-150 select-none">
        <div className="relative w-[45px] h-[30px] flex items-center justify-center">
          <div className="absolute left-0 w-[38px] h-full bg-[#25F4EE] rounded-[8px] z-[1]" />
          <div className="absolute right-0 w-[38px] h-full bg-[#FE2C55] rounded-[8px] z-[1]" />
          <div className="absolute w-[38px] h-full bg-white rounded-[8px] z-[2] flex items-center justify-center shadow-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round">
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
      className={`flex-1 flex flex-col items-center justify-center -translate-y-0.5 transition-opacity group select-none ${
        !isActive ? 'active:opacity-70' : ''
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className={`transition-all duration-200 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white/90'}`}>
          <IconComponent isActive={isActive} />
        </div>

        {/* Badge or Red dot */}
        {item.badge ? (
          <span className="absolute -top-1 -right-2.5 bg-[#FE2C55] text-white text-[10px] font-extrabold px-1.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center border border-black z-10 shadow-sm">
            {item.badge}
          </span>
        ) : item.path === '/search' ? (
          <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-[#FE2C55] rounded-full border border-black z-10" />
        ) : null}
      </div>

      <span
        className={`text-[10.5px] mt-1 font-semibold leading-tight tracking-tight transition-all duration-200 ${
          isActive ? 'text-white font-bold' : 'text-white/75'
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
      className="fixed min-[600px]:absolute left-0 w-full z-[1000] flex justify-around items-center bg-black border-t border-white/10 text-white shadow-2xl transition-all duration-300 select-none pb-1"
      style={{
        bottom: '0px',
        height: 'var(--bottom-nav-height, 54px)',
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
