import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiCheck, BiChevronLeft } from 'react-icons/bi';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';

const PrivacyOptionPage = ({ title, settingKey, options, helperText }) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  // Map internal database field names if they differ from settingKey
  const dbKeyMap = {
    'comments': 'commentPrivacy',
    'mentionsTags': 'mentionPrivacy',
    'directMessages': 'messagePrivacy',
    'downloads': 'downloadPrivacy',
  };
  
  const dbKey = dbKeyMap[settingKey] || settingKey;
  const [selectedValue, setSelectedValue] = useState(user?.[dbKey] || options[0].value);

  const handleSelect = async (value) => {
    setSelectedValue(value);
    try {
      const response = await userService.updateProfile({ [dbKey]: value });
      if (response.success) {
        updateUser(response.user);
      }
    } catch (error) {
      console.error(`Failed to update ${settingKey}:`, error);
      // Revert on error if needed, but usually we just keep it or show toast
    }
  };

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

      <div className="scrollable flex-1 px-4 pb-24 pt-6">
        {helperText && (
          <p className="theme-text-muted text-[13px] leading-6 mb-4 px-1">
            {helperText}
          </p>
        )}

        <div className="theme-panel-card rounded-[18px] overflow-hidden shadow-sm">
          {options.map((option, index) => {
            const isLast = index === options.length - 1;
            const isSelected = selectedValue === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`theme-panel-row w-full flex items-center justify-between gap-3 p-4 text-left transition-colors ${
                  !isLast ? 'border-b theme-panel-divider' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="theme-text-primary text-[15px] font-medium tracking-wide">
                    {option.label}
                  </p>
                  {option.description && (
                    <p className="theme-text-faint text-[12px] mt-1 leading-5">
                      {option.description}
                    </p>
                  )}
                </div>

                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isSelected && <BiCheck size={22} className="text-[#FE2C55]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PrivacyOptionPage;
