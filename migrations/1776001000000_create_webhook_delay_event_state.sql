-- Migration: create_webhook_delay_event_state
-- issue-117: Track delay webhook emission state to avoid duplicate events.

CREATE TABLE IF NOT EXISTS webhook_delay_event_state (
  bed_id            UUID PRIMARY KEY REFERENCES beds(id) ON DELETE CASCADE,
  last_stage_id     UUID REFERENCES stages(id) ON DELETE SET NULL,
  last_delayed      BOOLEAN NOT NULL DEFAULT FALSE,
  last_threshold_ms INTEGER NOT NULL,
  last_emitted_at   TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_delay_event_state_threshold_positive CHECK (last_threshold_ms > 0)
);

COMMENT ON TABLE webhook_delay_event_state IS 'Remembers latest delayed/not-delayed state per bed for webhook emission deduplication.';
