import React from 'react';
import { useParams } from 'react-router-dom';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getHelpArticleBySlug } from '../../../../utils/helpCenterData';

const HelpArticleDetailPage = () => {
  const { articleSlug = '' } = useParams();
  const article = getHelpArticleBySlug(articleSlug);

  if (!article) {
    return (
      <SettingsSubPageLayout title="Article">
        <div className="bg-[#242424] rounded-[18px] px-5 py-12 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-white">Article not found</p>
          <p className="text-[12px] text-white/40 mt-2">This help article is not available right now.</p>
        </div>
      </SettingsSubPageLayout>
    );
  }

  return (
    <SettingsSubPageLayout title="Help article">
      <div className="bg-[#242424] rounded-[20px] p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[12px] text-white/40 mb-3">
          <span>{article.category}</span>
          <span>•</span>
          <span>{article.readTime}</span>
        </div>

        <h3 className="text-[22px] leading-tight font-bold text-white">{article.title}</h3>
        <p className="text-[14px] leading-7 text-white/50 mt-4">{article.excerpt}</p>

        <div className="space-y-4 mt-6">
          {article.content.map((paragraph) => (
            <p key={paragraph} className="text-[14px] leading-7 text-white/75">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-5 bg-[#242424] rounded-[18px] p-4 shadow-sm">
        <p className="text-[14px] font-semibold text-white">Was this helpful?</p>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            className="flex-1 rounded-[14px] border border-white/10 px-4 py-3 text-[13px] font-semibold text-white active:bg-white/5 transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            className="flex-1 rounded-[14px] border border-white/10 px-4 py-3 text-[13px] font-semibold text-white active:bg-white/5 transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </SettingsSubPageLayout>
  );
};

export default HelpArticleDetailPage;
