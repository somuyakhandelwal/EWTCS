-- Migration 033: Add ai_summary column to daily_summaries
-- Stores the LLM-generated text summary for the day.

ALTER TABLE daily_summaries 
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Down Migration
-- ALTER TABLE daily_summaries DROP COLUMN IF EXISTS ai_summary;
