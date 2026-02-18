-- Migration 003: Add User Management Features 
-- Purpose: Enable admin to manage users and track user management actions
-- Epic 5: Authentication & Role-Based Access
-- User Story: US-5.3

-- Up Migration

-- Add is_active column to users table for deactivation feature
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index on is_active for fast filtering
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create audit log table for user management actions
CREATE TABLE IF NOT EXISTS user_management_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DEACTIVATE', 'ACTIVATE'
    target_user_id UUID NOT NULL REFERENCES users(id),
    performed_by_user_id UUID NOT NULL REFERENCES users(id),
    changes JSONB, -- Store what was changed (role, username, etc.)
    reason TEXT, -- Optional reason for the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_user_logs_target ON user_management_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_performed_by ON user_management_logs(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_management_logs(created_at DESC);

-- Update existing users to be active by default
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

-- Add comments for documentation
COMMENT ON TABLE user_management_logs IS 'Audit trail for all user management actions performed by admins';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active. Deactivated users cannot log in';
