import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyDirectMessagesPage = () => (
  <PrivacyOptionPage
    title="Direct messages"
    settingKey="directMessages"
    helperText="Choose who can send you direct messages on Jhumroo."
    options={[
      { value: 'everyone', label: 'Everyone', description: 'Anyone can start a chat with you.' },
      { value: 'friends', label: 'Friends', description: 'Only mutual followers can message you.' },
      { value: 'no_one', label: 'No one', description: 'New direct messages will be turned off.' },
    ]}
  />
);

export default PrivacyDirectMessagesPage;
