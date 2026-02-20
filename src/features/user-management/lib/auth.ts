/**
 * Re-export shared auth utilities for user management
 * Epic 5: US-5.3 - User Management
 * 
 * This file now delegates to shared utilities in @/shared/lib/auth
 * for consistency across all features.
 */
export {
	requireAdmin,
	requireAdminWrite,
	requireRole,
	requireSupervisorOrAdmin,
	getCurrentSession,
} from '@/shared/lib/auth'
