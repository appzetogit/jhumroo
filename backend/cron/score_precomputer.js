import { query } from '../config/postgres.js';

/**
 * Precomputes engagement and trending velocity scores for all reels.
 * This runs as a background batch job (cron equivalent) to populate and update the 'reel_scores' cache.
 */
export const precomputeScores = async () => {
  const startTime = Date.now();
  console.log('🔄 [CRON] Starting Reels Score Precomputation Job...');

  const sqlQuery = `
    WITH engagement_metrics AS (
      SELECT 
        r.id AS reel_id,
        COUNT(CASE WHEN ua.activity_type = 'like' THEN 1 END) AS likes_count,
        COUNT(CASE WHEN ua.activity_type = 'comment' THEN 1 END) AS comments_count,
        COUNT(CASE WHEN ua.activity_type = 'share' THEN 1 END) AS shares_count,
        COALESCE(AVG(CASE WHEN ua.activity_type = 'watch_time' THEN (ua.duration / NULLIF(r.duration, 0)) END), 0) AS avg_completion_rate,
        
        -- Velocity metric (interactions in the last 24 hours) for trending
        COUNT(CASE WHEN ua.activity_type = 'like' AND ua.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS likes_count_24h,
        COUNT(CASE WHEN ua.activity_type = 'comment' AND ua.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS comments_count_24h,
        COUNT(CASE WHEN ua.activity_type = 'share' AND ua.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS shares_count_24h,
        COUNT(CASE WHEN ua.activity_type = 'view' AND ua.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS views_count_24h
      FROM reels r
      LEFT JOIN user_activity ua ON r.id = ua.reel_id
      GROUP BY r.id
    )
    INSERT INTO reel_scores (reel_id, engagement_score, trending_score, precomputed_at)
    SELECT 
      reel_id,
      -- Base Engagement Score Formula:
      -- W_like(2.0) * likes + W_comment(4.0) * comments + W_share(8.0) * shares + W_watch(10.0) * completion
      ROUND((likes_count * 2.0 + comments_count * 4.0 + shares_count * 8.0 + avg_completion_rate * 10.0), 4) AS engagement_score,
      
      -- Trending Score Formula (24-hour interaction velocity):
      -- Higher weights for recent actions to capture real-time virality
      ROUND((likes_count_24h * 4.0 + comments_count_24h * 8.0 + shares_count_24h * 16.0 + views_count_24h * 2.0), 4) AS trending_score,
      NOW() AS precomputed_at
    FROM engagement_metrics
    ON CONFLICT (reel_id) DO UPDATE SET
      engagement_score = EXCLUDED.engagement_score,
      trending_score = EXCLUDED.trending_score,
      precomputed_at = EXCLUDED.precomputed_at;
  `;

  try {
    const result = await query(sqlQuery);
    const duration = Date.now() - startTime;
    console.log(`✅ [CRON] Scores precomputed successfully! [${duration}ms] [Reels Updated: ${result.rowCount}]`);
  } catch (error) {
    console.error('❌ [CRON] Failed to precompute scores:', error);
  }
};

// Check if this script was executed directly
if (process.argv[1] && process.argv[1].endsWith('score_precomputer.js')) {
  precomputeScores().then(() => {
    process.exit(0);
  });
}
