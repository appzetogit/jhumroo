import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyDownloadsPage = () => (
  <PrivacyOptionPage
    title="Downloads"
    settingKey="downloads"
    helperText="Decide whether other people can download your public videos."
    options={[
      { value: 'On', label: 'On', description: 'Allow downloads for your public videos.' },
      { value: 'Off', label: 'Off', description: 'Prevent others from downloading your videos.' },
    ]}
  />
);

export default PrivacyDownloadsPage;
