import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight, BiShieldAlt, BiKey, BiShield } from 'react-icons/bi';
import {
  getDevicesSummary,
  getPasswordSummary,
  getSecurityAlertsSummary,
  getTwoStepSummary,
} from '../../../../utils/securitySettings';
import { useAppContent } from '../../../../hooks/useAppContent';

const SecurityPage = () => {
    const navigate = useNavigate();
    const securityAlertsSummary = getSecurityAlertsSummary();
    const { config } = useAppContent();
    const iconMap = {
      alert: BiShieldAlt,
      device: BiShield,
      password: BiKey,
      twoStep: BiShield,
    };
    const valueMap = {
      securityAlerts: { value: securityAlertsSummary.value, color: securityAlertsSummary.color },
      devices: { value: getDevicesSummary() },
      password: { value: getPasswordSummary() },
      twoStep: { value: getTwoStepSummary() },
    };
    const securitySections = (config?.settings?.securitySections || []).map((section) => ({
      ...section,
      items: (section.items || []).map((item) => {
        const Icon = item.icon ? iconMap[item.icon] : null;
        const mappedValue = item.value ? valueMap[item.value] : null;
        return {
          ...item,
          icon: Icon ? <Icon size={20} /> : null,
          value: mappedValue?.value,
          color: mappedValue?.color,
        };
      }),
    }));

    const handleItemClick = (item) => {
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
                <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">Security</h2>
                <div className="w-10"></div>
            </div>

            <div className="scrollable flex-1 px-4 pb-24 pt-6">
                {securitySections.map((section, idx) => (
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
                                            {item.value && (
                                                <span 
                                                    className="theme-text-faint text-[14px] font-medium" 
                                                    style={item.color ? { color: item.color } : undefined}
                                                >
                                                    {item.value}
                                                </span>
                                            )}
                                            <BiChevronRight size={22} className="theme-text-faint" />
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

export default SecurityPage;
