-- Migration 022: Performance Indexes (EPIC 13 - System Performance & Reliability)
-- Adds indexes that support Dashboard <2s and Reports <3s SLA targets.
-- NOTE: This project runs migrations in a single transaction, so CONCURRENTLY
-- cannot be used here.

-- =============================================================================
-- bed_stage_logs table: most-queried table in the system
-- =============================================================================

-- Primary filter for transition queries (analytics, TAT, wait-time)
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_bed_id_time
  ON bed_stage_logs (bed_id, transition_time DESC);

-- Date-range analytics filtering (analytics page, report exports)
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_transition_time
  ON bed_stage_logs (transition_time DESC);

-- Stage duration stats: GROUP BY to_stage_id
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_to_stage_id
  ON bed_stage_logs (to_stage_id);

-- TAT queries filter by from_stage_id + to_stage_id
CREATE INDEX IF NOT EXISTS idx_bed_stage_logs_from_stage_id
  ON bed_stage_logs (from_stage_id);

-- =============================================================================
-- beds table
-- =============================================================================

-- All dashboard and analytics queries filter WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_beds_is_active
  ON beds (is_active) WHERE is_active = true;

-- Occupied beds (wait-time queries filter is_active AND is_occupied)
CREATE INDEX IF NOT EXISTS idx_beds_is_active_occupied
  ON beds (is_active, is_occupied) WHERE is_active = true AND is_occupied = true;

-- =============================================================================
-- stage_delay_thresholds table
-- =============================================================================

-- Per-stage threshold lookup in the dashboard bottleneck query
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_delay_thresholds_stage_id
  ON stage_delay_thresholds (stage_id);

-- =============================================================================
-- disposition_delay_reasons table
-- =============================================================================

-- LATERAL join in bed-bottleneck-queries: filter by bed_id, resolved_at IS NULL,
-- ORDER BY recorded_at DESC
CREATE INDEX IF NOT EXISTS idx_disp_delay_reasons_bed_open
  ON disposition_delay_reasons (bed_id, recorded_at DESC)
  WHERE resolved_at IS NULL;

-- =============================================================================
-- system_settings table
-- =============================================================================

-- getGlobalThresholdMs: SELECT WHERE key = 'delay_threshold_minutes'
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_key
  ON system_settings (key);

-- =============================================================================
-- stages table
-- =============================================================================

-- TAT queries: LOWER(stages.name) ILIKE 'cleaning' / 'empty'
CREATE INDEX IF NOT EXISTS idx_stages_name_lower
  ON stages (LOWER(name));

-- Down Migration
DROP INDEX IF EXISTS idx_stages_name_lower;
DROP INDEX IF EXISTS idx_system_settings_key;
DROP INDEX IF EXISTS idx_disp_delay_reasons_bed_open;
DROP INDEX IF EXISTS idx_stage_delay_thresholds_stage_id;
DROP INDEX IF EXISTS idx_beds_is_active_occupied;
DROP INDEX IF EXISTS idx_beds_is_active;
DROP INDEX IF EXISTS idx_bed_stage_logs_from_stage_id;
DROP INDEX IF EXISTS idx_bed_stage_logs_to_stage_id;
DROP INDEX IF EXISTS idx_bed_stage_logs_transition_time;
DROP INDEX IF EXISTS idx_bed_stage_logs_bed_id_time;
