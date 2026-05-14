import React from 'react';
import PrivacyOptionPage from './PrivacyOptionPage';

const PrivacyStitchPage = () => (
  <PrivacyOptionPage
    title="Stitch"
    settingKey="stitch"
    helperText="Control who can stitch your videos into their own content."
    options={[
      { value: 'Everyone', label: 'Everyone', description: 'Anyone can stitch your videos.' },
      { value: 'Friends', label: 'Friends', description: 'Only friends can stitch your videos.' },
      { value: 'Only me', label: 'Only me', description: 'Stitch will stay off for others.' },
    ]}
  />
);

export default PrivacyStitchPage;
