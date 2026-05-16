import React, { useState, useEffect } from 'react';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import adminStaticPageService from '../../../../services/adminStaticPageService';
import { BiLoaderAlt } from 'react-icons/bi';

const StaticContentPage = ({ slug, defaultTitle, backTo }) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const response = await adminStaticPageService.getStaticPage(slug);
        if (response.success) {
          setPage(response.page);
        }
      } catch (error) {
        console.error(`Error fetching ${slug}:`, error);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <SettingsSubPageLayout title={defaultTitle} backTo={backTo}>
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <BiLoaderAlt className="animate-spin mb-2 text-white" size={32} />
          <p className="text-[14px] text-white">Loading...</p>
        </div>
      </SettingsSubPageLayout>
    );
  }

  return (
    <SettingsSubPageLayout title={page?.title || defaultTitle} backTo={backTo}>
      <div className="space-y-6 text-white/70 text-[14px] leading-relaxed px-1 pb-10">
        {page?.content ? (
          <div 
            className="dynamic-content whitespace-pre-wrap prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        ) : (
          <p className="opacity-40 italic">No content available.</p>
        )}
      </div>
    </SettingsSubPageLayout>
  );
};

export const TermsAndConditionPage = ({ backTo }) => {
  return <StaticContentPage slug="terms-and-condition" defaultTitle="Terms & Condition" backTo={backTo} />;
};

export const PrivacyPolicyPage = ({ backTo }) => {
  return <StaticContentPage slug="privacy-policy" defaultTitle="Privacy Policy" backTo={backTo} />;
};
