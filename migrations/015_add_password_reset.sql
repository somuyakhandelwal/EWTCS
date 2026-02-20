-- US-5.5: Password Reset Functionality
-- Adds support for forced password change after admin-issued temp passwords

ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS temp_password_set_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for quickly finding users that must change password (admin dashboard queries)
CREATE INDEX IF NOT EXISTS idx_users_must_change_password
    ON users (must_change_password)
    WHERE must_change_password = TRUE;

COMMENT ON COLUMN users.must_change_password IS
    'US-5.5: Set to TRUE when admin issues a temporary password. Cleared after user sets their own password.';

COMMENT ON COLUMN users.temp_password_set_at IS
    'US-5.5: Timestamp when the temp password was issued. Temp passwords expire after 24 hours.';
