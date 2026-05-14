import React from 'react';
import SettingsSubPageLayout from './SettingsSubPageLayout';

const StaticContentPage = ({ title, content }) => {
  return (
    <SettingsSubPageLayout title={title}>
      <div className="space-y-6 text-white/70 text-[14px] leading-relaxed px-1 pb-10">
        {content.map((section, idx) => (
          <div key={idx} className="space-y-3">
            {section.heading && (
              <h3 className="text-white text-[16px] font-bold mt-6 first:mt-0">{section.heading}</h3>
            )}
            <p>{section.text}</p>
          </div>
        ))}
      </div>
    </SettingsSubPageLayout>
  );
};

export const TermsAndConditionPage = () => {
  const content = [
    {
      heading: '1. Acceptance of Terms',
      text: 'By accessing and using Jhumroo, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use the service.',
    },
    {
      heading: '2. User Content',
      text: 'You are responsible for the content you post on Jhumroo. You grant Jhumroo a non-exclusive, royalty-free license to use, copy, and display your content.',
    },
    {
      heading: '3. Prohibited Conduct',
      text: 'Users may not engage in any activity that is illegal, harmful, or violates the rights of others. This includes harassment, spamming, and distribution of malware.',
    },
    {
      heading: '4. Limitation of Liability',
      text: 'Jhumroo is provided "as is" without any warranties. We are not liable for any damages arising from your use of the service.',
    },
  ];

  return <StaticContentPage title="Terms & Condition" content={content} />;
};

export const PrivacyPolicyPage = () => {
  const content = [
    {
      heading: '1. Information We Collect',
      text: 'We collect information you provide directly to us, such as your profile information and content you post. We also collect device information and usage data.',
    },
    {
      heading: '2. How We Use Information',
      text: 'We use the information we collect to provide, maintain, and improve our services, and to personalize your experience.',
    },
    {
      heading: '3. Data Sharing',
      text: 'We do not sell your personal data. We may share information with service providers who help us operate the service.',
    },
    {
      heading: '4. Your Choices',
      text: 'You can manage your privacy settings and delete your account at any time through the settings menu.',
    },
  ];

  return <StaticContentPage title="Privacy Policy" content={content} />;
};
