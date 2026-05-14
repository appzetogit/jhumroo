import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronRight, BiSearch } from 'react-icons/bi';
import SettingsSubPageLayout from './SettingsSubPageLayout';
import { getHelpArticles } from '../../../../utils/helpCenterData';

const HelpArticlesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const articles = getHelpArticles();

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return articles;
    }

    return articles.filter((article) =>
      [article.title, article.category, article.excerpt].join(' ').toLowerCase().includes(query),
    );
  }, [articles, searchQuery]);

  const featuredArticle = filteredArticles[0];
  const remainingArticles = filteredArticles.slice(1);

  return (
    <SettingsSubPageLayout title="Help center">
      <div className="bg-[#242424] rounded-[18px] p-4 flex items-center gap-2 mb-5 border border-white/5 focus-within:border-white/20 transition-all">
        <BiSearch size={20} className="text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search articles"
          className="bg-transparent text-white text-[15px] outline-none font-medium w-full placeholder:text-white/20"
        />
      </div>

      {featuredArticle && (
        <button
          type="button"
          onClick={() => navigate(`/settings/help-center/articles/${featuredArticle.slug}`)}
          className="w-full text-left bg-[linear-gradient(135deg,#2A2F49,#1E2237)] rounded-[20px] p-5 shadow-sm mb-5 active:opacity-90 transition-opacity"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45 mb-2">
            Featured article
          </p>
          <p className="text-[18px] font-bold text-white">{featuredArticle.title}</p>
          <p className="text-[13px] text-white/55 mt-2 leading-6">{featuredArticle.excerpt}</p>
          <div className="flex items-center gap-2 mt-4 text-[12px] text-white/45">
            <span>{featuredArticle.category}</span>
            <span>•</span>
            <span>{featuredArticle.readTime}</span>
          </div>
        </button>
      )}

      {remainingArticles.length > 0 ? (
        <div className="bg-[#242424] rounded-[18px] overflow-hidden shadow-sm">
          {remainingArticles.map((article, index) => {
            const isLast = index === remainingArticles.length - 1;

            return (
              <button
                key={article.slug}
                type="button"
                onClick={() => navigate(`/settings/help-center/articles/${article.slug}`)}
                className={`w-full flex items-center justify-between gap-3 p-4 text-left active:bg-white/5 transition-colors ${
                  !isLast ? 'border-b border-white border-opacity-[0.05]' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-white/90 truncate">{article.title}</p>
                  <p className="text-[12px] text-white/35 mt-1 truncate">
                    {article.category} • {article.readTime}
                  </p>
                </div>
                <BiChevronRight size={20} className="text-white/30 shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#242424] rounded-[18px] px-5 py-12 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-white">No articles found</p>
          <p className="text-[12px] text-white/40 mt-2">Try another search term.</p>
        </div>
      )}
    </SettingsSubPageLayout>
  );
};

export default HelpArticlesPage;
