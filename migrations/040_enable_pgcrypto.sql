-- ============================================================================
-- pgcrypto Extension Setup for EWTCS
-- ============================================================================
-- Enables PostgreSQL native encryption functions
-- Used for: digest(), encrypt(), decrypt() operations
-- 
-- Status: Optional for Phase 1 (used in Phase 4+ database migrations)
-- 
-- Run this migration manually or via: npm run db:migrate
-- ============================================================================

-- Enable pgcrypto extension (one-time setup)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extension is loaded
-- SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';

-- ============================================================================
-- Utility Functions (optional, for future use)
-- ============================================================================

-- Generate random bytes using pgcrypto (for seed/IV generation)
-- Usage: SELECT generate_random_bytes(16);

-- Create SHA256 digest (for field verification)
-- Usage: SELECT digest('text', 'sha256');

-- Note: Most encryption will happen in Node.js (AES-256-GCM)
-- pgcrypto provides complementary server-side functions only
