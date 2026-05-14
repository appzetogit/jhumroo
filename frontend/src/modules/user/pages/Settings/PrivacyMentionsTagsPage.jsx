import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyMentionsTagsPage = () => (
  <PrivacyOptionPage
    title="Mentions and tags"
    settingKey="mentionsTags"
    helperText="Control who can mention you in captions and tag you in posts."
    options={[
      { value: 'Everyone', label: 'Everyone', description: 'All users can mention and tag you.' },
      { value: 'Friends', label: 'Friends', description: 'Only friends can mention and tag you.' },
      { value: 'No one', label: 'No one', description: 'Mentions and tags will be disabled.' },
    ]}
  />
);

export default PrivacyMentionsTagsPage;
