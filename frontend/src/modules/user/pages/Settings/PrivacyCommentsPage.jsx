import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyCommentsPage = () => {
  return (
    <PrivacyOptionPage
      title="Comments"
      settingKey="comments"
      helperText="Choose who can comment on your public videos."
      options={[
        { value: 'everyone', label: 'Everyone', description: 'Anyone can comment on your content.' },
        { value: 'friends', label: 'Friends', description: 'Only mutual followers can comment.' },
        { value: 'no_one', label: 'No one', description: 'Turn off comments for your videos.' },
      ]}
    />
  );
};

export default PrivacyCommentsPage;
