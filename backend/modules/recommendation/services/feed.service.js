import { query } from '../../../config/postgres.js';

/**
 * Service to generate personalized or trending feeds for users.
 */
export const getPersonalizedFeed = async (userId, limit = 10, offset = 0, trending = false) => {
  const parsedLimit = parseInt(limit) || 10;
  const parsedOffset = parseInt(offset) || 0;

  let feedQuery = '';
  let queryParams = [];

  if (trending) {
    // Trending Feed: Primary sort by precomputed trending score (24h velocity) and time decay
    feedQuery = `
      SELECT 
        r.id,
        r.user_id,
        r.video_url,
        r.caption,
        r.categories,
        r.duration,
        r.created_at,
        u_creator.username AS creator_username,
        COALESCE(rs.engagement_score, 0.0) AS engagement_score,
        COALESCE(rs.trending_score, 0.0) AS trending_score,
        0.0 AS interest_score,
        0.0 AS social_score,
        ROUND(CAST(1.0 / POWER((1.0 + (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0)), 1.5) AS numeric), 6) AS time_decay,
        ROUND(CAST(
          COALESCE(rs.trending_score, 0.0) * (1.0 / POWER((1.0 + (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0)), 1.5))
        AS numeric), 4) AS recommendation_score
      FROM reels r
      INNER JOIN users u_creator ON r.user_id = u_creator.id
      LEFT JOIN reel_scores rs ON r.id = rs.reel_id
      WHERE 
        -- If logged in, exclude completed videos to keep feed fresh
        ($1::integer IS NULL OR NOT EXISTS (
          SELECT 1 FROM user_activity ua 
          WHERE ua.user_id = $1 AND ua.reel_id = r.id AND ua.activity_type = 'watch_time' AND ua.completed = true
        ))
      ORDER BY recommendation_score DESC, r.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    queryParams = [userId, parsedLimit, parsedOffset];
  } else {
    // Personalized Feed: Custom recommendation formula utilizing:
    // 1. Precomputed Base Score
    // 2. Dynamic Category Match (+15 points on tag intersection)
    // 3. Social Weight (+5 points if user follows creator)
    // 4. Freshness Decay (exponential decay based on hours elapsed)
    feedQuery = `
      SELECT 
        r.id,
        r.user_id,
        r.video_url,
        r.caption,
        r.categories,
        r.duration,
        r.created_at,
        u_creator.username AS creator_username,
        COALESCE(rs.engagement_score, 0.0) AS engagement_score,
        COALESCE(rs.trending_score, 0.0) AS trending_score,
        
        -- Interest Score: GIN array overlap check
        CASE 
          WHEN $1::integer IS NOT NULL AND (r.categories && (SELECT interests FROM users WHERE id = $1)) THEN 15.0 
          ELSE 0.0 
        END AS interest_score,
        
        -- Social Score: check follower relationship
        CASE 
          WHEN $1::integer IS NOT NULL AND EXISTS (
            SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = r.user_id
          ) THEN 5.0 
          ELSE 0.0 
        END AS social_score,
        
        -- Time Decay
        ROUND(CAST(1.0 / POWER((1.0 + (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0)), 1.5) AS numeric), 6) AS time_decay,
        
        -- Combined Ranking Score: (Engagement + Interest + Social) * TimeDecay
        ROUND(CAST(
          (
            COALESCE(rs.engagement_score, 0.0) + 
            (CASE WHEN $1::integer IS NOT NULL AND (r.categories && (SELECT interests FROM users WHERE id = $1)) THEN 15.0 ELSE 0.0 END) + 
            (CASE WHEN $1::integer IS NOT NULL AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = r.user_id) THEN 5.0 ELSE 0.0 END)
          ) * (1.0 / POWER((1.0 + (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600.0)), 1.5))
        AS numeric), 4) AS recommendation_score
      FROM reels r
      INNER JOIN users u_creator ON r.user_id = u_creator.id
      LEFT JOIN reel_scores rs ON r.id = rs.reel_id
      WHERE 
        -- Filter completed watch times to promote discovery
        ($1::integer IS NULL OR NOT EXISTS (
          SELECT 1 FROM user_activity ua 
          WHERE ua.user_id = $1 AND ua.reel_id = r.id AND ua.activity_type = 'watch_time' AND ua.completed = true
        ))
      ORDER BY recommendation_score DESC, r.id DESC
      LIMIT $2 OFFSET $3;
    `;
    queryParams = [userId, parsedLimit, parsedOffset];
  }

  const result = await query(feedQuery, queryParams);
  return result.rows;
};
