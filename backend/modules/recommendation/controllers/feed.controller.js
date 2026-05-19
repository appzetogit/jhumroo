import { getPersonalizedFeed } from '../services/feed.service.js';

/**
 * Endpoint to retrieve the personalized or trending reels feed.
 */
export const getFeed = async (req, res, next) => {
  try {
    // If the request bypassed strict protection, user is optional (guest)
    const userId = req.user ? req.user.id : null;
    
    const { limit = 10, offset = 0, trending = false } = req.query;

    const isTrending = trending === true || trending === 'true';

    const reels = await getPersonalizedFeed(
      userId, 
      parseInt(limit), 
      parseInt(offset), 
      isTrending
    );

    res.status(200).json({
      success: true,
      count: reels.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      reels
    });
  } catch (error) {
    next(error);
  }
};
