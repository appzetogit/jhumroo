import { readAdminConfig } from './adminConfigStorage';

const getHelpCenterData = () => readAdminConfig().helpCenter || {};

export const getSafetyTopics = () => getHelpCenterData().safetyTopics || [];
export const getPrivacySecurityFaqs = () => getHelpCenterData().privacySecurityFaqs || [];
export const getReportProblemCategories = () => getHelpCenterData().reportProblemCategories || [];
export const getHelpArticles = () => getHelpCenterData().helpArticles || [];
export const getHelpArticleBySlug = (articleSlug) =>
  (getHelpCenterData().helpArticles || []).find((article) => article.slug === articleSlug) || null;
