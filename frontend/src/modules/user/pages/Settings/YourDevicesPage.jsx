import React, { useState } from 'react';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getDevices, removeDevice } from '../../../../utils/securitySettings';

const YourDevicesPage = () => {
  const [devices, setDevices] = useState(() => getDevices());

  const handleLogoutDevice = (deviceId) => {
    const updatedSettings = removeDevice(deviceId);
    setDevices(updatedSettings.devices);
  };

  const currentDevice = devices.find((device) => device.isCurrent);
  const otherDevices = devices.filter((device) => !device.isCurrent);

  return (
    <SettingsSubPageLayout title="Your devices">
      <p className="text-[13px] leading-6 text-white/45 mb-4 px-1">
        Manage the devices where your account is currently signed in.
      </p>

      {currentDevice && (
        <div className="mb-5">
          <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3 ml-1">
            Current device
          </h4>
          <div className="bg-[#242424] rounded-[18px] p-4 shadow-sm">
            <p className="text-[15px] font-semibold text-white">{currentDevice.name}</p>
            <p className="text-[12px] text-white/45 mt-1">{currentDevice.platform}</p>
            <p className="text-[12px] text-white/35 mt-3">{currentDevice.location}</p>
            <div className="mt-3 inline-flex px-3 py-1.5 rounded-full bg-[#4CD964]/10 text-[#4CD964] text-[11px] font-semibold uppercase tracking-[0.16em]">
              Active now
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3 ml-1">
          Other devices
        </h4>
        {otherDevices.length > 0 ? (
          <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
            {otherDevices.map((device, index) => {
              const isLast = index === otherDevices.length - 1;

              return (
                <div
                  key={device.id}
                  className={`flex items-center gap-3 p-4 ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                >
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-white/70">
                    <span className="text-[14px] font-bold">{device.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate">{device.name}</p>
                    <p className="text-[12px] text-white/45 truncate">{device.location}</p>
                    <p className="text-[12px] text-white/35 truncate mt-1">{device.lastActive}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLogoutDevice(device.id)}
                    className="px-4 py-2 rounded-full border border-white/15 text-[12px] font-semibold text-white active:bg-white/5 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#242424] rounded-[18px] px-5 py-12 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-white">No other active devices</p>
            <p className="text-[12px] text-white/40 mt-2">
              Your account is only signed in on this phone right now.
            </p>
          </div>
        )}
      </div>
    </SettingsSubPageLayout>
  );
};

export default YourDevicesPage;
