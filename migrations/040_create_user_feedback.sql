-- Migration 040: Create user_feedback table
-- Purpose: US-18.7 — Allow users to submit in-app feedback for system adoption monitoring.

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,   -- 'general' | 'bug' | 'feature' | 'training' | 'usability'
    rating          SMALLINT CHECK (rating >= 1 AND rating <= 5),
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id    ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category   ON user_feedback(category);

COMMENT ON TABLE user_feedback IS 'In-app user feedback for adoption monitoring (US-18.7)';
COMMENT ON COLUMN user_feedback.category IS 'One of: general | bug | feature | training | usability';
COMMENT ON COLUMN user_feedback.rating IS '1–5 star rating (nullable if user opts to skip)';
COMMENT ON COLUMN user_feedback.message IS 'Free-text feedback message (nullable)';
