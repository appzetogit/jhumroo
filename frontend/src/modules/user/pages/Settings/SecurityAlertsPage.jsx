import React, { useState } from 'react';
import { BiCheckCircle, BiErrorCircle } from 'react-icons/bi';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getSecurityAlerts, markSecurityAlertReviewed } from '../../../../utils/securitySettings';

const SecurityAlertsPage = () => {
  const [alerts, setAlerts] = useState(() => getSecurityAlerts());

  const handleReview = (alertId) => {
    const updatedSettings = markSecurityAlertReviewed(alertId);
    setAlerts(updatedSettings.securityAlerts);
  };

  return (
    <SettingsSubPageLayout title="Security alerts">
      <p className="text-[13px] leading-6 text-white/45 mb-4 px-1">
        Review recent account activity and security-related updates.
      </p>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[#242424] rounded-[18px] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                {alert.reviewed ? (
                  <BiCheckCircle size={20} className="text-[#4CD964]" />
                ) : (
                  <BiErrorCircle size={20} className="text-[#FE2C55]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-white truncate">{alert.title}</p>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.14em] shrink-0 ${
                      alert.reviewed ? 'text-[#4CD964]' : 'text-[#FE2C55]'
                    }`}
                  >
                    {alert.reviewed ? 'Reviewed' : 'Attention'}
                  </span>
                </div>
                <p className="text-[12px] text-white/35 mt-1">
                  {new Date(alert.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })}{' '}
                  at{' '}
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
                <p className="text-[13px] leading-6 text-white/60 mt-3">{alert.details}</p>

                {!alert.reviewed && (
                  <button
                    type="button"
                    onClick={() => handleReview(alert.id)}
                    className="mt-4 px-4 py-2 rounded-full bg-[#FE2C55] text-white text-[12px] font-semibold active:brightness-95 transition-colors"
                  >
                    Mark as reviewed
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SettingsSubPageLayout>
  );
};

export default SecurityAlertsPage;
