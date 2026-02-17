-- Migration 006: Add Ward-Level Access Control
-- Purpose: Prevent IDOR attacks by enforcing bed access based on user's ward assignment
-- Epic: EPIC 2 - One-Click Stage Update System with Access Control
-- Security: Fixes IDOR vulnerability

-- Add ward_id to beds table
ALTER TABLE beds
ADD COLUMN IF NOT EXISTS ward_id UUID,
ADD COLUMN IF NOT EXISTS ward_name VARCHAR(100);

-- Add ward_id to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ward_id UUID;

-- Create wards table for reference
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ward access queries
CREATE INDEX IF NOT EXISTS idx_beds_ward_id ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users(ward_id);
CREATE INDEX IF NOT EXISTS idx_wards_active ON wards(is_active);

-- Insert default wards (can be customized per hospital)
INSERT INTO wards (name, code, description) VALUES
    ('Emergency Ward A', 'EWA', 'Emergency Ward Zone A'),
    ('Emergency Ward B', 'EWB', 'Emergency Ward Zone B'),
    ('Emergency Ward C', 'EWC', 'Emergency Ward Zone C')
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN beds.ward_id IS 'Ward this bed belongs to. Used for access control';
COMMENT ON COLUMN beds.ward_name IS 'Denormalized ward name for quick reference';
COMMENT ON COLUMN users.ward_id IS 'Ward assignment for nurses and supervisors';
COMMENT ON TABLE wards IS 'Hospital wards for bed and user assignments';

-- Add foreign key constraint
ALTER TABLE beds
ADD CONSTRAINT fk_beds_ward FOREIGN KEY (ward_id) REFERENCES wards(id);

ALTER TABLE users
ADD CONSTRAINT fk_users_ward FOREIGN KEY (ward_id) REFERENCES wards(id);
