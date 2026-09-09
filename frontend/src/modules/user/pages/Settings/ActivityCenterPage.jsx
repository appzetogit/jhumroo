import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight, BiQrScan, BiTimeFive, BiSearch, BiPlayCircle } from 'react-icons/bi';

const ActivityCenterPage = () => {
  const navigate = useNavigate();

  const activityItems = [
    {
      id: 'qr',
      title: 'Your QR Profile',
      icon: BiQrScan,
      route: '/settings/activity-center/qr-profile',
    },
    {
      id: 'screen-time',
      title: 'Screen time',
      icon: BiTimeFive,
      route: '/settings/activity-center/screen-time',
    },
    {
      id: 'search-history',
      title: 'Search history',
      icon: BiSearch,
      route: '/settings/activity-center/search-history',
    },
    {
      id: 'watch-history',
      title: 'Watch history',
      icon: BiPlayCircle,
      route: '/settings/activity-center/watch-history',
    },
  ];

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
        <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">
          Activity Center
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="scrollable flex-1 px-4 pb-12 pt-2 flex flex-col gap-3">
        {/* Activity Items Card */}
        <div className="theme-panel-card rounded-[18px] overflow-hidden shadow-sm">
          {activityItems.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === activityItems.length - 1;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.route)}
                className={`theme-panel-row flex items-center justify-between p-4 cursor-pointer transition-colors active:opacity-75 ${
                  !isLast ? 'border-b theme-panel-divider' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 theme-text-primary">
                  <div className="opacity-90 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="text-[15px] font-medium tracking-wide">
                    {item.title}
                  </span>
                </div>
                <BiChevronRight size={22} className="theme-text-faint shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivityCenterPage;
