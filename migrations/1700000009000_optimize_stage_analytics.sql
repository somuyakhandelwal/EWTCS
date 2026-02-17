-- Migration 009: Optimize Stage Analytics Queries
-- Purpose: Add indexes and materialized views for efficient analytics queries
-- Epic: EPIC 3 - Time Tracking & Stage Logging
--
-- This migration improves performance of analytical queries by:
-- 1. Adding indexes on frequently filtered columns
-- 2. Creating a materialized view for quick access to duration statistics

-- Add index on bed_stage_logs for faster filtering by date range
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_transition_time_bed 
ON bed_stage_logs(transition_time DESC, bed_id);

-- Add index for filtering by changed_by_user_id
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_user_transition 
ON bed_stage_logs(changed_by_user_id, transition_time DESC);

-- Add composite index for querying by bed and time range
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_bed_time 
ON bed_stage_logs(bed_id, transition_time DESC);

-- Add index on duration_in_previous_stage_ms for analytics queries
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_duration 
ON bed_stage_logs(duration_in_previous_stage_ms) WHERE duration_in_previous_stage_ms IS NOT NULL;

-- Add index on to_stage_id for stage filtering
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_to_stage 
ON bed_stage_logs(to_stage_id, transition_time DESC);

-- Create a materialized view for quick stage duration statistics
-- This view pre-calculates common statistics to avoid expensive recalculation
CREATE MATERIALIZED VIEW IF NOT EXISTS stage_duration_statistics AS
SELECT 
  s.id as stage_id,
  s.name as stage_name,
  s.display_order as stage_order,
  COUNT(bsl.id) as total_transitions,
  COUNT(bsl.duration_in_previous_stage_ms) as transitions_with_duration,
  ROUND(AVG(bsl.duration_in_previous_stage_ms)::numeric, 2) as avg_duration_ms,
  MIN(bsl.duration_in_previous_stage_ms) as min_duration_ms,
  MAX(bsl.duration_in_previous_stage_ms) as max_duration_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms)::numeric, 2) as median_duration_ms,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms)::numeric, 2) as p90_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms)::numeric, 2) as p95_duration_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY bsl.duration_in_previous_stage_ms)::numeric, 2) as p99_duration_ms,
  MIN(bsl.transition_time) as first_transition_time,
  MAX(bsl.transition_time) as last_transition_time,
  COUNT(DISTINCT bsl.bed_id) as unique_beds,
  CURRENT_TIMESTAMP as last_refreshed
FROM stages s
LEFT JOIN bed_stage_logs bsl ON s.id = bsl.to_stage_id
GROUP BY s.id, s.name, s.display_order
ORDER BY s.display_order;

-- Create index on the materialized view for faster queries
CREATE INDEX IF NOT EXISTS idx_stage_duration_statistics_stage_id 
ON stage_duration_statistics(stage_id);

-- Create another view for bed timeline summary
CREATE MATERIALIZED VIEW IF NOT EXISTS bed_timeline_summary AS
SELECT 
  b.id as bed_id,
  b.bed_number,
  b.patient_start_time,
  COUNT(bsl.id) as total_transitions,
  ROUND(
    (EXTRACT(EPOCH FROM 
      COALESCE(
        (SELECT MAX(transition_time) FROM bed_stage_logs WHERE bed_id = b.id),
        CURRENT_TIMESTAMP
      ) - COALESCE(b.patient_start_time, CURRENT_TIMESTAMP)
    ) * 1000)::numeric, 2
  ) as total_time_ms,
  MIN(bsl.transition_time) as first_transition,
  MAX(bsl.transition_time) as last_transition,
  CURRENT_TIMESTAMP as last_refreshed
FROM beds b
LEFT JOIN bed_stage_logs bsl ON b.id = bsl.bed_id
WHERE b.is_active = true
GROUP BY b.id, b.bed_number, b.patient_start_time;

-- Create index on bed timeline summary
CREATE INDEX IF NOT EXISTS idx_bed_timeline_summary_bed_id 
ON bed_timeline_summary(bed_id);

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW stage_duration_statistics IS 
'Pre-calculated statistics for each stage. Refresh periodically for latest data. Indexed for fast access.';

COMMENT ON MATERIALIZED VIEW bed_timeline_summary IS 
'Summary statistics for each bed including total transitions and time. Refresh periodically for latest data.';

-- Note: To refresh materialized views periodically, use:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY stage_duration_statistics;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY bed_timeline_summary;
--
-- Consider setting up a cron job (using pg_cron extension) for automatic refresh:
-- SELECT cron.schedule('refresh-stage-statistics', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY stage_duration_statistics');
-- SELECT cron.schedule('refresh-bed-timeline', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY bed_timeline_summary');
