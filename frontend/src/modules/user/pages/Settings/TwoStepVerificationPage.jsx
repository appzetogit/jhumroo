import React, { useState } from 'react';
import { BiCheck } from 'react-icons/bi';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getSecuritySettings, setTwoStepVerification } from '../../../../utils/securitySettings';
import { useAppContent } from '../../../../hooks/useAppContent';

const TwoStepVerificationPage = () => {
  const { config } = useAppContent();
  const verificationMethods = config?.settings?.verificationMethods || [];
  const [securitySettings, setSecuritySettings] = useState(() => getSecuritySettings());

  const handleToggle = () => {
    setSecuritySettings(
      setTwoStepVerification(!securitySettings.twoStepEnabled, securitySettings.twoStepMethod),
    );
  };

  const handleMethodSelect = (method) => {
    setSecuritySettings(setTwoStepVerification(true, method));
  };

  return (
    <SettingsSubPageLayout title="2-step verification">
      <p className="text-[13px] leading-6 text-white/45 mb-4 px-1">
        Add an extra verification step to help protect your account from unauthorized access.
      </p>

      <div className="bg-[#242424] rounded-[18px] p-4 shadow-sm mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-white">2-step verification</p>
            <p className="text-[12px] text-white/40 mt-1">
              {securitySettings.twoStepEnabled
                ? `Enabled with ${securitySettings.twoStepMethod}`
                : 'Currently turned off'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className={`w-[46px] h-6 rounded-full flex items-center shrink-0 transition-colors duration-300 ${
              securitySettings.twoStepEnabled ? 'bg-[#FE2C55]' : 'bg-transparent border border-white/20'
            }`}
          >
            <div
              className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm transform transition-transform duration-300 ${
                securitySettings.twoStepEnabled ? 'translate-x-[24px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-3 ml-1">
          Verification method
        </h4>
        <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
          {verificationMethods.map((method, index) => {
            const isLast = index === verificationMethods.length - 1;
            const isSelected =
              securitySettings.twoStepEnabled && securitySettings.twoStepMethod === method;

            return (
              <button
                key={method}
                type="button"
                onClick={() => handleMethodSelect(method)}
                className={`w-full flex items-center justify-between gap-3 p-4 text-left transition-colors ${
                  securitySettings.twoStepEnabled ? 'active:bg-white/5 cursor-pointer' : 'cursor-default'
                } ${!isLast ? 'border-b border-white border-opacity-[0.05]' : ''}`}
                disabled={!securitySettings.twoStepEnabled}
              >
                <div>
                  <p className={`text-[15px] font-medium tracking-wide ${securitySettings.twoStepEnabled ? 'text-white/90' : 'text-white/35'}`}>
                    {method}
                  </p>
                  <p className="text-[12px] text-white/35 mt-1">
                    {method === 'SMS' && 'Receive verification codes by text message.'}
                    {method === 'Email' && 'Get login codes on your registered email.'}
                    {method === 'Authenticator app' && 'Use an authenticator app for rotating codes.'}
                  </p>
                </div>
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isSelected && <BiCheck size={22} className="text-[#FE2C55]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSubPageLayout>
  );
};

export default TwoStepVerificationPage;
