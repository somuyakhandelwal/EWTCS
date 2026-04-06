-- Migration 058: Normalize delay reasons with foreign key reference
-- Issue: DB2-02
-- Purpose: Add delay_reason_option_id FK to disposition_delay_reasons
--          Backfill from enum values, keep reason column for backward compatibility

-- Up Migration

ALTER TABLE disposition_delay_reasons 
ADD COLUMN IF NOT EXISTS delay_reason_option_id UUID REFERENCES delay_reason_options(id);

-- Backfill: match existing reason enum values to delay_reason_options.value
UPDATE disposition_delay_reasons ddr 
SET delay_reason_option_id = o.id 
FROM delay_reason_options o 
WHERE ddr.reason::text = o.value;

-- Create index for efficient FK queries
CREATE INDEX IF NOT EXISTS idx_ddr_delay_reason_option_id 
ON disposition_delay_reasons(delay_reason_option_id);

-- Mark reason column as deprecated
COMMENT ON COLUMN disposition_delay_reasons.reason IS 
  'Deprecated: kept for backward compatibility. Use delay_reason_option_id instead.';

-- Down Migration

DROP INDEX IF EXISTS idx_ddr_delay_reason_option_id;
ALTER TABLE disposition_delay_reasons 
DROP COLUMN IF EXISTS delay_reason_option_id;
COMMENT ON COLUMN disposition_delay_reasons.reason IS 'The recorded reason for the delay';
