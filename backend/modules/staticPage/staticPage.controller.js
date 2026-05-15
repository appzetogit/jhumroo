import StaticPage from '../../models/StaticPage.model.js';
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
