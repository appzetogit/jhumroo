import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyDirectMessagesPage = () => (
  <PrivacyOptionPage
    title="Direct messages"
    settingKey="directMessages"
    helperText="Choose who can send you direct messages on Jhumroo."
    options={[
      { value: 'Everyone', label: 'Everyone', description: 'Anyone can start a chat with you.' },
      { value: 'Friends', label: 'Friends', description: 'Only mutual followers can message you.' },
      { value: 'No one', label: 'No one', description: 'New direct messages will be turned off.' },
    ]}
  />
);

export default PrivacyDirectMessagesPage;
