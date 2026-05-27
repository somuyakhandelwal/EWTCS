-- Migration: create_webhook_integration_tables
-- issue-117: Webhook support for real-time external integrations

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(100) NOT NULL,
  target_url             TEXT NOT NULL,
  signing_secret         TEXT NOT NULL,
  subscribed_events      TEXT[] NOT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  timeout_ms             INTEGER NOT NULL DEFAULT 5000,
  max_retries            INTEGER NOT NULL DEFAULT 3,
  retry_backoff_base_ms  INTEGER NOT NULL DEFAULT 500,
  created_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_endpoints_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT webhook_endpoints_url_not_blank CHECK (LENGTH(TRIM(target_url)) > 0),
  CONSTRAINT webhook_endpoints_timeout_positive CHECK (timeout_ms > 0),
  CONSTRAINT webhook_endpoints_max_retries_non_negative CHECK (max_retries >= 0),
  CONSTRAINT webhook_endpoints_backoff_positive CHECK (retry_backoff_base_ms > 0),
  CONSTRAINT webhook_endpoints_events_not_empty CHECK (COALESCE(array_length(subscribed_events, 1), 0) > 0),
  CONSTRAINT webhook_endpoints_allowed_events CHECK (
    subscribed_events <@ ARRAY['bed.status.changed', 'bed.delay.threshold.exceeded']::TEXT[]
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_endpoints_target_url_name
  ON webhook_endpoints (target_url, name);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active
  ON webhook_endpoints (is_active)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id      UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_id         UUID NOT NULL,
  event_type       TEXT NOT NULL,
  payload          JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  attempts         INTEGER NOT NULL DEFAULT 0,
  next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at  TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_deliveries_allowed_status CHECK (
    status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter')
  ),
  CONSTRAINT webhook_deliveries_allowed_events CHECK (
    event_type IN ('bed.status.changed', 'bed.delay.threshold.exceeded')
  ),
  CONSTRAINT webhook_deliveries_attempts_non_negative CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_event_endpoint
  ON webhook_deliveries (event_id, endpoint_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries (next_attempt_at ASC)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_created
  ON webhook_deliveries (endpoint_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id         UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  endpoint_id         UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  attempt_number      INTEGER NOT NULL,
  attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_signature   TEXT,
  response_status     INTEGER,
  response_body       TEXT,
  duration_ms         INTEGER,
  error_message       TEXT,
  succeeded           BOOLEAN NOT NULL DEFAULT FALSE,
  next_retry_at       TIMESTAMPTZ,
  CONSTRAINT webhook_delivery_attempts_number_positive CHECK (attempt_number > 0),
  CONSTRAINT webhook_delivery_attempts_duration_non_negative CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_delivery
  ON webhook_delivery_attempts (delivery_id, attempt_number DESC);

COMMENT ON TABLE webhook_endpoints IS 'External webhook receiver configurations and event subscriptions.';
COMMENT ON TABLE webhook_deliveries IS 'Durable webhook outbox rows created when subscribed events occur.';
COMMENT ON TABLE webhook_delivery_attempts IS 'Attempt-level delivery logs for observability and retries.';
COMMENT ON COLUMN webhook_endpoints.signing_secret IS 'Shared secret used to generate HMAC SHA-256 signatures.';
COMMENT ON COLUMN webhook_deliveries.status IS 'pending | processing | delivered | failed | dead_letter';
COMMENT ON COLUMN webhook_delivery_attempts.request_signature IS 'HMAC signature sent in the outbound request headers.';
