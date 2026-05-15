import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyMentionsTagsPage = () => (
  <PrivacyOptionPage
    title="Mentions and tags"
    settingKey="mentionsTags"
    helperText="Control who can mention you in captions and tag you in posts."
    options={[
      { value: 'everyone', label: 'Everyone', description: 'All users can mention and tag you.' },
      { value: 'friends', label: 'Friends', description: 'Only friends can mention and tag you.' },
      { value: 'no_one', label: 'No one', description: 'Mentions and tags will be disabled.' },
    ]}
  />
);

export default PrivacyMentionsTagsPage;
