-- Migration 014: Add IP tracking and immutability protection for audit logs
-- Purpose: EPIC 12 compliance requirements

-- Add IP address column for traceability
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Indexes for compliance queries and investigations
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Prevent updates/deletes on audit logs (append-only table)
CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs are immutable: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_logs_mutation_trigger ON audit_logs;

CREATE TRIGGER prevent_audit_logs_mutation_trigger
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_logs_mutation();

COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address captured from request headers';
COMMENT ON TABLE audit_logs IS 'Immutable append-only audit trail for compliance and traceability';
