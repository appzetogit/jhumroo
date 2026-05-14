import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft } from 'react-icons/bi';
import { useAppContent } from '../../../../hooks/useAppContent';

const PushNotificationsPage = () => {
    const navigate = useNavigate();
    const { config } = useAppContent();
    const sections = config?.settings?.pushNotifications || [];

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
                <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">Push notifications</h2>
                <div className="w-10"></div>
            </div>

            <div className="scrollable flex-1 px-4 pb-24 pt-6">
                {sections.map((section, idx) => (
                    <div key={idx} className="mb-8">
                        <h4 className="theme-section-title text-[11px] font-bold uppercase tracking-widest mb-3 ml-1">{section.title}</h4>
                        <div className="theme-panel-card rounded-[18px] overflow-hidden shadow-sm">
                            {section.items.map((item, itemIdx) => {
                                const isLast = itemIdx === section.items.length - 1;
                                return (
                                    <div 
                                        key={itemIdx} 
                                        className={`theme-panel-row flex justify-between items-center p-4 ${!isLast ? 'border-b theme-panel-divider' : ''}`}
                                    >
                                        <span className="theme-text-primary text-[15px] font-medium tracking-wide">{item.label}</span>
                                        <div className={`w-[46px] h-6 rounded-full flex items-center shrink-0 transition-colors duration-300 ${item.default ? 'bg-[#FE2C55]' : 'bg-transparent border border-white/20'}`}>
                                            <div className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-300 ${item.default ? 'translate-x-[24px]' : 'translate-x-[2px]'}`}></div>
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

export default PushNotificationsPage;
