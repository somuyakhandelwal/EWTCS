-- Migration 004: Refactor to Generic Audit Logging
-- Purpose: Convert user_management_logs to generic audit_logs for all entities
-- This allows tracking changes for users, beds, patients, and any future entities

-- Rename user_management_logs to audit_logs
ALTER TABLE user_management_logs RENAME TO audit_logs;

-- Add entity_type and entity_id columns for generic entity tracking
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS entity_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Populate entity_id from target_user_id for existing records
UPDATE audit_logs SET entity_id = target_user_id WHERE entity_id = '00000000-0000-0000-0000-000000000000';

-- Remove default constraint after populating
ALTER TABLE audit_logs ALTER COLUMN entity_id DROP DEFAULT;
ALTER TABLE audit_logs ALTER COLUMN entity_type DROP DEFAULT;

-- Add metadata column for flexible additional data
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Rename target_user_id to keep backward compatibility (optional, can be removed later)
-- For now we'll keep it but make it nullable since it's specific to user entities
ALTER TABLE audit_logs 
ALTER COLUMN target_user_id DROP NOT NULL;

-- Create new indexes for generic queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Drop old specific indexes (they're renamed automatically with the table)
-- But we'll keep them as they still work for the renamed table

-- Update comments for documentation
COMMENT ON TABLE audit_logs IS 'Generic audit trail for all entity changes (users, beds, patients, etc.)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being tracked (user, bed, patient, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity being tracked';
COMMENT ON COLUMN audit_logs.target_user_id IS 'Legacy column for user-specific logs (kept for backward compatibility)';
COMMENT ON COLUMN audit_logs.performed_by_user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action (CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, etc.)';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing what was changed';
COMMENT ON COLUMN audit_logs.reason IS 'Optional reason for the action';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional flexible metadata for feature-specific data';
