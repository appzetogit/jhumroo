import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyCommentsPage = () => (
  <PrivacyOptionPage
    title="Comments"
    settingKey="comments"
    helperText="Choose who can comment on your public videos."
    options={[
      { value: 'Everyone', label: 'Everyone', description: 'Anyone can comment on your content.' },
      { value: 'Friends', label: 'Friends', description: 'Only mutual followers can comment.' },
      { value: 'No one', label: 'No one', description: 'Turn off comments for your videos.' },
    ]}
  />
);

export default PrivacyCommentsPage;
