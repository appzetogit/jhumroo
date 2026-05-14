import React, { useState } from 'react';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { updatePasswordMeta } from '../../../../utils/securitySettings';

const PasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all password fields.');
      setSuccessMessage('');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters.');
      setSuccessMessage('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password must match.');
      setSuccessMessage('');
      return;
    }

    updatePasswordMeta();
    setErrorMessage('');
    setSuccessMessage('Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <SettingsSubPageLayout title="Password">
      <p className="text-[13px] leading-6 text-white/45 mb-4 px-1">
        Update your password regularly to keep your account secure.
      </p>

      <div className="bg-[#242424] rounded-[18px] p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-[12px] text-white/40 uppercase tracking-[0.18em] mb-2">
            Current password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-[16px] bg-white/5 border border-white/10 px-4 py-3 text-[14px] text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[12px] text-white/40 uppercase tracking-[0.18em] mb-2">
            New password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-[16px] bg-white/5 border border-white/10 px-4 py-3 text-[14px] text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[12px] text-white/40 uppercase tracking-[0.18em] mb-2">
            Confirm password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-[16px] bg-white/5 border border-white/10 px-4 py-3 text-[14px] text-white outline-none"
          />
        </div>

        <p className="text-[12px] leading-5 text-white/35">
          Use at least 8 characters with a mix of letters, numbers, and symbols.
        </p>

        {errorMessage && <p className="text-[12px] text-[#FE2C55]">{errorMessage}</p>}
        {successMessage && <p className="text-[12px] text-[#4CD964]">{successMessage}</p>}

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-[16px] bg-[#FE2C55] text-white text-[14px] font-semibold py-3 active:brightness-95 transition-colors"
        >
          Save password
        </button>
      </div>
    </SettingsSubPageLayout>
  );
};

export default PasswordPage;
