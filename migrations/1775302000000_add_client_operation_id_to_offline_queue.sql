-- Migration: add_client_operation_id_to_offline_queue
-- DB5-01 hardening: deduplicate local+db drain operations by stable client operation id

ALTER TABLE offline_queue
  ADD COLUMN IF NOT EXISTS client_operation_id VARCHAR(120);

UPDATE offline_queue
SET client_operation_id = COALESCE(client_operation_id, id::text)
WHERE client_operation_id IS NULL;

ALTER TABLE offline_queue
  ALTER COLUMN client_operation_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_offline_queue_user_client_operation
  ON offline_queue (user_id, client_operation_id);

CREATE INDEX IF NOT EXISTS idx_offline_queue_client_operation_id
  ON offline_queue (client_operation_id);
