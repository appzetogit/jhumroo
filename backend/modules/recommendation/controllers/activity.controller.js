import { query } from '../../../config/postgres.js';

/**
 * Tracks user interactions with reels (likes, comments, shares, views, watch time).
 */
export const trackActivity = async (req, res, next) => {
  try {
    const { reel_id, activity_type, duration, completed } = req.body;
    const userId = req.user.id;

    if (!reel_id || !activity_type) {
      return res.status(400).json({
        success: false,
        message: 'reel_id and activity_type are required.'
      });
    }

    const allowedTypes = ['like', 'comment', 'share', 'view', 'watch_time'];
    if (!allowedTypes.includes(activity_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity_type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // Toggle behavior for likes (acting as like/unlike)
    if (activity_type === 'like') {
      const existingLike = await query(
        "SELECT id FROM user_activity WHERE user_id = $1 AND reel_id = $2 AND activity_type = 'like' LIMIT 1",
        [userId, reel_id]
      );

      if (existingLike.rows.length > 0) {
        // Unlike - Remove the interaction entry
        await query(
          "DELETE FROM user_activity WHERE user_id = $1 AND reel_id = $2 AND activity_type = 'like'",
          [userId, reel_id]
        );

        return res.status(200).json({
          success: true,
          message: 'Like removed successfully.',
          liked: false
        });
      }
    }

    const durationVal = duration ? parseFloat(duration) : 0.00;
    const completedVal = completed === true || completed === 'true';

    const insertResult = await query(
      `INSERT INTO user_activity (user_id, reel_id, activity_type, duration, completed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, reel_id, activity_type, duration, completed, created_at`,
      [userId, reel_id, activity_type, durationVal, completedVal]
    );

    res.status(201).json({
      success: true,
      message: `${activity_type} interaction tracked successfully.`,
      activity: insertResult.rows[0],
      liked: activity_type === 'like' ? true : undefined
    });
  } catch (error) {
    next(error);
  }
};
