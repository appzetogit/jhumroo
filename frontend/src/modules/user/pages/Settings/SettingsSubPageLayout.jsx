import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft } from 'react-icons/bi';

const SettingsSubPageLayout = ({ title, children }) => {
  const navigate = useNavigate();

  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      <div className="theme-page-header flex items-center justify-between px-4 pt-6 pb-6 shrink-0 relative">
        <div
          className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
          onClick={() => navigate(-1)}
        >
          <BiChevronLeft size={24} className="theme-text-primary" />
        </div>
        <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">
          {title}
        </h2>
        <div className="w-10" />
      </div>

      <div className="scrollable flex-1 px-4 pb-24 pt-6">{children}</div>
    </div>
  );
};

export default SettingsSubPageLayout;
