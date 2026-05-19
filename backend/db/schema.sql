-- PostgreSQL Schema for TikTok/Instagram Style Reels Recommendation System

-- Enable uuid-ossp extension if UUIDs are needed later
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    interests VARCHAR(50)[] DEFAULT '{}', -- E.g., {'comedy', 'tech', 'dance', 'gaming'}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for users interests (GIN index for array searching)
CREATE INDEX IF NOT EXISTS idx_users_interests ON users USING gin(interests);

-- 2. Reels Table
CREATE TABLE IF NOT EXISTS reels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT,
    categories VARCHAR(50)[] DEFAULT '{}', -- E.g., {'tech', 'gaming'}
    duration NUMERIC(6, 2) NOT NULL DEFAULT 15.00, -- Duration in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GIN index for rapid category matching query intersection
CREATE INDEX IF NOT EXISTS idx_reels_categories ON reels USING gin(categories);
-- Index for finding reels of a specific user
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
-- Index on created_at for freshness time decay calculation
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);

-- 3. Follows Table (Social Connections)
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- Index for retrieving followers/following lists rapidly
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id, follower_id);

-- 4. User Activity Table (High throughput table tracking interactions)
CREATE TABLE IF NOT EXISTS user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reel_id INTEGER REFERENCES reels(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL, -- 'like', 'comment', 'share', 'view', 'watch_time'
    duration NUMERIC(6, 2) DEFAULT 0.00, -- Actual watch time (used for 'watch_time' type)
    completed BOOLEAN DEFAULT FALSE, -- True if completion rate >= 1.0 (watched full video)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite covering index for user engagement checks and recommendation exclusion
CREATE INDEX IF NOT EXISTS idx_user_activity_lookup ON user_activity(user_id, reel_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_reel ON user_activity(reel_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);

-- 5. Reel Scores Table (Precomputed values updated via Cron job for instantaneous feed loading)
CREATE TABLE IF NOT EXISTS reel_scores (
    reel_id INTEGER PRIMARY KEY REFERENCES reels(id) ON DELETE CASCADE,
    engagement_score NUMERIC(12, 4) DEFAULT 0.0000, -- Engagement score: W_like * likes + ...
    trending_score NUMERIC(12, 4) DEFAULT 0.0000, -- High velocity interaction index
    precomputed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for ordering search by engagement and velocity
CREATE INDEX IF NOT EXISTS idx_reel_scores_engagement ON reel_scores(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_reel_scores_trending ON reel_scores(trending_score DESC);
