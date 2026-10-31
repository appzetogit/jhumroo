import StaticPage from '../../models/StaticPage.model.js';
import SystemSetting from '../../models/SystemSetting.model.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * @desc    Get static page content by slug
 * @route   GET /api/static-pages/:slug
 * @access  Public
 */
export const getStaticPage = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  let page = await StaticPage.findOne({ slug });

  if (!page) {
    // Return a default structure instead of 404 to prevent frontend errors before first save
    return res.status(200).json({
      success: true,
      page: {
        slug,
        title: slug === 'terms-and-condition' ? 'Terms & Condition' : 'Privacy Policy',
        content: ''
      }
    });
  }

  res.status(200).json({
    success: true,
    page
  });
});

/**
 * @desc    Create or Update static page content (Admin only)
 * @route   POST /api/admin/static-pages
 * @access  Private/Admin
 */
export const updateStaticPage = asyncHandler(async (req, res) => {
  const { slug, title, content } = req.body;

  if (!slug || !title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Slug, title and content are required'
    });
  }

  let page = await StaticPage.findOne({ slug });

  if (page) {
    page.title = title;
    page.content = content;
    page.lastUpdatedBy = req.admin?._id;
    await page.save();
  } else {
    page = await StaticPage.create({
      slug,
      title,
      content,
      lastUpdatedBy: req.admin?._id
    });
  }

  res.status(200).json({
    success: true,
    message: `${title} updated successfully`,
    page
  });
});

const APP_LINK_FIELDS = ['playStoreUrl', 'appStoreUrl'];

/**
 * @desc    Get app download links
 * @route   GET /api/static-pages/app-links
 * @access  Public
 */
export const getAppLinks = asyncHandler(async (req, res) => {
  const setting = await SystemSetting.findOne({ key: 'app_links' });
  const links = Object.fromEntries(APP_LINK_FIELDS.map((f) => [f, setting?.value?.[f] || '']));

  res.status(200).json({
    success: true,
    links
  });
});

/**
 * @desc    Update app download links (Admin only)
 * @route   POST /api/admin/static-pages/app-links
 * @access  Private/Admin
 */
export const updateAppLinks = asyncHandler(async (req, res) => {
  const links = {};
  for (const f of APP_LINK_FIELDS) {
    const value = String(req.body[f] || '').trim();
    // Only http(s) links - these are rendered as <a href> on the public landing page
    if (value && !/^https?:\/\/\S+$/i.test(value)) {
      return res.status(400).json({
        success: false,
        message: `${f} must be a valid http(s) URL`
      });
    }
    links[f] = value;
  }

  await SystemSetting.findOneAndUpdate(
    { key: 'app_links' },
    { value: links },
    { upsert: true, new: true }
  );

  res.status(200).json({
    success: true,
    message: 'App links updated successfully',
    links
  });
});
