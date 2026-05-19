import { query } from '../../../config/postgres.js';

/**
 * Handles uploading a new reel.
 * Saves record in 'reels' and inserts default baseline scores in 'reel_scores'.
 */
export const uploadReel = async (req, res, next) => {
  try {
    const { video_url, caption, categories, duration } = req.body;
    const userId = req.user.id;

    if (!video_url) {
      return res.status(400).json({
        success: false,
        message: 'Video URL is required.'
      });
    }

    // Format categories/interests to lowercase arrays
    const formattedCategories = Array.isArray(categories)
      ? categories.map(tag => tag.toLowerCase().trim())
      : [];

    const videoDuration = duration ? parseFloat(duration) : 15.00;

    const reelResult = await query(
      `INSERT INTO reels (user_id, video_url, caption, categories, duration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, video_url, caption, categories, duration, created_at`,
      [userId, video_url, caption, formattedCategories, videoDuration]
    );

    const reel = reelResult.rows[0];

    // Seed baseline entries in cached reel_scores to make it instantly eligible for queries
    await query(
      `INSERT INTO reel_scores (reel_id, engagement_score, trending_score)
       VALUES ($1, 0.0000, 0.0000)
       ON CONFLICT (reel_id) DO NOTHING`,
      [reel.id]
    );

    res.status(201).json({
      success: true,
      message: 'Reel successfully uploaded in Postgres.',
      reel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle follow/unfollow for a creator.
 */
export const toggleFollowCreator = async (req, res, next) => {
  try {
    const { following_id } = req.body;
    const followerId = req.user.id;

    if (!following_id) {
      return res.status(400).json({
        success: false,
        message: 'following_id is required.'
      });
    }

    const targetId = parseInt(following_id);

    if (followerId === targetId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.'
      });
    }

    // Check existing follow relationship
    const followCheck = await query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1',
      [followerId, targetId]
    );

    if (followCheck.rows.length > 0) {
      // Unfollow - delete from table
      await query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, targetId]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Unfollowed creator successfully.',
        following: false
      });
    } else {
      // Follow - insert into table
      await query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [followerId, targetId]
      );

      return res.status(200).json({
        success: true,
        message: 'Followed creator successfully.',
        following: true
      });
    }
  } catch (error) {
    next(error);
  }
};
