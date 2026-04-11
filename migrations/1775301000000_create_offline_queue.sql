-- Migration: create_offline_queue
-- DB5-01: Persist offline queue operations in database

CREATE TABLE IF NOT EXISTS offline_queue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,
  payload        JSONB NOT NULL,
  enqueued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  drained_at     TIMESTAMPTZ,
  failed_at      TIMESTAMPTZ,
  error_message  TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_user_pending
  ON offline_queue (user_id, enqueued_at ASC)
  WHERE drained_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_offline_queue_pending
  ON offline_queue (enqueued_at ASC)
  WHERE drained_at IS NULL AND failed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_offline_queue_failed
  ON offline_queue (failed_at DESC)
  WHERE drained_at IS NULL AND failed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offline_queue_payload_bed_id
  ON offline_queue ((payload->>'bedId'));

COMMENT ON TABLE offline_queue IS 'Offline write operations persisted for resilient sync and recovery.';
COMMENT ON COLUMN offline_queue.operation_type IS 'One of: stage-update | discharge | disposition-reason';
COMMENT ON COLUMN offline_queue.payload IS 'Operation payload as JSONB (contains bedId and operation-specific fields).';
COMMENT ON COLUMN offline_queue.drained_at IS 'Set when operation has been successfully applied to source of truth.';
COMMENT ON COLUMN offline_queue.failed_at IS 'Set when drain attempt failed. Failed rows remain retryable until drained.';
