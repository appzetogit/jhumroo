import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyDuetPage = () => (
  <PrivacyOptionPage
    title="Duet"
    settingKey="duet"
    helperText="Manage who can create duet videos using your public posts."
    options={[
      { value: 'Everyone', label: 'Everyone', description: 'Anyone can duet with your videos.' },
      { value: 'Friends', label: 'Friends', description: 'Only friends can create duets.' },
      { value: 'Only me', label: 'Only me', description: 'Duet will stay disabled for others.' },
    ]}
  />
);

export default PrivacyDuetPage;
