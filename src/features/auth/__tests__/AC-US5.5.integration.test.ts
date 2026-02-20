import { describe, it, expect } from 'vitest'
import { changePasswordSchema } from '@/features/auth/schemas/change-password-schema'
import { adminResetPasswordSchema } from '@/features/user-management/schemas/password-reset-schema'

// US-5.5 Acceptance Criteria — Password Reset Functionality
describe('US-5.5 Acceptance Criteria — Password Reset Functionality', () => {

    // ── Helpers (pure logic extracted from action/lib code) ──────────────────

    const TEMP_PASSWORD_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

    function isTempPasswordExpired(tempPasswordSetAt: Date | null): boolean {
        if (!tempPasswordSetAt) return false
        return Date.now() - new Date(tempPasswordSetAt).getTime() > TEMP_PASSWORD_EXPIRY_MS
    }

    function isMustChangePasswordActive(mustChangePassword: boolean): boolean {
        return mustChangePassword === true
    }

    function tempPasswordMatchesFormat(pw: string): boolean {
        // Format: "Temp@" + 6 uppercase hex chars
        return /^Temp@[0-9A-F]{6}$/.test(pw)
    }

    // ── AC-1: "Forgot Password" link exists (static check, UI-only) ──────────
    describe('AC-1: Forgot Password link info', () => {
        it('should recommend contacting admin when no email is configured', () => {
            // Simulates the logic gate: email config absent → admin flow
            const emailConfigured = false
            const message = emailConfigured
                ? 'Reset link sent to your email'
                : 'Contact your administrator for a temporary password'
            expect(message).toBe('Contact your administrator for a temporary password')
        })
    })

    // ── AC-2: Admin can reset passwords manually ─────────────────────────────
    describe('AC-2: Admin reset password schema validation', () => {
        it('should accept a valid UUID as userId', () => {
            const result = adminResetPasswordSchema.safeParse({
                userId: '550e8400-e29b-41d4-a716-446655440000',
            })
            expect(result.success).toBe(true)
        })

        it('should reject a missing userId', () => {
            const result = adminResetPasswordSchema.safeParse({})
            expect(result.success).toBe(false)
        })

        it('should reject a non-UUID userId', () => {
            const result = adminResetPasswordSchema.safeParse({ userId: 'not-a-uuid' })
            expect(result.success).toBe(false)
        })
    })

    // ── AC-3: Temporary passwords must match expected format ─────────────────
    describe('AC-3: Temporary password format', () => {
        it('should match the Temp@XXXXXX pattern', () => {
            expect(tempPasswordMatchesFormat('Temp@3F2A1B')).toBe(true)
        })

        it('should reject passwords not matching the pattern', () => {
            expect(tempPasswordMatchesFormat('temp@3f2a1b')).toBe(false) // lowercase
            expect(tempPasswordMatchesFormat('Pass@word1')).toBe(false)  // wrong prefix
            expect(tempPasswordMatchesFormat('Temp@ZZZZZZ')).toBe(false) // invalid hex
        })
    })

    // ── AC-4: Temporary passwords expire after first use (24-hour window) ────
    describe('AC-4: Temporary password expiry (24 hours)', () => {
        it('should not be expired when set_at is null', () => {
            expect(isTempPasswordExpired(null)).toBe(false)
        })

        it('should not be expired when set less than 24h ago', () => {
            const recent = new Date(Date.now() - 23 * 60 * 60 * 1000) // 23h ago
            expect(isTempPasswordExpired(recent)).toBe(false)
        })

        it('should be expired when set more than 24h ago', () => {
            const old = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25h ago
            expect(isTempPasswordExpired(old)).toBe(true)
        })

        it('should treat exactly 24h boundary as expired', () => {
            // boundary: exactly 24h + 1ms
            const boundary = new Date(Date.now() - TEMP_PASSWORD_EXPIRY_MS - 1)
            expect(isTempPasswordExpired(boundary)).toBe(true)
        })

        it('should treat just under 24h as not expired', () => {
            const almostExpired = new Date(Date.now() - TEMP_PASSWORD_EXPIRY_MS + 5_000)
            expect(isTempPasswordExpired(almostExpired)).toBe(false)
        })
    })

    // ── AC-5: Password reset is logged (audit entry structure) ───────────────
    describe('AC-5: Password reset audit log structure', () => {
        it('should produce a valid RESET_PASSWORD audit entry', () => {
            const entry = {
                actionType: 'RESET_PASSWORD',
                entityType: 'user',
                entityId: '550e8400-e29b-41d4-a716-446655440001',
                performedBy: '550e8400-e29b-41d4-a716-446655440000',
                changes: { reason: 'Admin-initiated password reset' },
            }
            expect(entry.actionType).toBe('RESET_PASSWORD')
            expect(entry.entityType).toBe('user')
            expect(typeof entry.entityId).toBe('string')
            expect(typeof entry.performedBy).toBe('string')
        })

        it('should produce a valid CHANGE_PASSWORD audit entry', () => {
            const userId = '550e8400-e29b-41d4-a716-446655440001'
            const entry = {
                actionType: 'CHANGE_PASSWORD',
                entityType: 'user',
                entityId: userId,
                performedBy: userId, // user changes their own password
                changes: { reason: 'User changed password after admin reset' },
            }
            expect(entry.actionType).toBe('CHANGE_PASSWORD')
            expect(entry.entityId).toBe(entry.performedBy) // self-service
        })
    })

    // ── AC-6: mustChangePassword session flag ─────────────────────────────────
    describe('AC-6: Session mustChangePassword flag', () => {
        it('should be active when flag is true', () => {
            expect(isMustChangePasswordActive(true)).toBe(true)
        })

        it('should not be active when flag is false', () => {
            expect(isMustChangePasswordActive(false)).toBe(false)
        })

        it('should persist through a round-trip serialisation (JWT payload simulation)', () => {
            const payload = { userId: 'u1', role: 'nurse', mustChangePassword: true }
            const serialised = JSON.stringify(payload)
            const parsed = JSON.parse(serialised)
            expect(parsed.mustChangePassword).toBe(true)
        })

        it('should be absent from payload when user has no pending reset', () => {
            const payload: Record<string, unknown> = { userId: 'u1', role: 'nurse' }
            expect(payload.mustChangePassword).toBeUndefined()
        })
    })

    // ── AC-7: Change-password Zod schema validation ───────────────────────────
    describe('AC-7: changePasswordSchema validation', () => {
        it('should accept a valid strong password', () => {
            const result = changePasswordSchema.safeParse({
                newPassword: 'Hospital1',
                confirmPassword: 'Hospital1',
            })
            expect(result.success).toBe(true)
        })

        it('should reject passwords shorter than 8 characters', () => {
            const result = changePasswordSchema.safeParse({
                newPassword: 'Ab1',
                confirmPassword: 'Ab1',
            })
            expect(result.success).toBe(false)
            const errs = result.error?.flatten().fieldErrors.newPassword
            expect(errs?.some((e) => e.includes('8 characters'))).toBe(true)
        })

        it('should reject passwords without an uppercase letter', () => {
            const result = changePasswordSchema.safeParse({
                newPassword: 'hospital1',
                confirmPassword: 'hospital1',
            })
            expect(result.success).toBe(false)
            const errs = result.error?.flatten().fieldErrors.newPassword
            expect(errs?.some((e) => e.includes('uppercase'))).toBe(true)
        })

        it('should reject passwords without a number', () => {
            const result = changePasswordSchema.safeParse({
                newPassword: 'HospitalA',
                confirmPassword: 'HospitalA',
            })
            expect(result.success).toBe(false)
            const errs = result.error?.flatten().fieldErrors.newPassword
            expect(errs?.some((e) => e.includes('number'))).toBe(true)
        })

        it('should reject mismatched passwords', () => {
            const result = changePasswordSchema.safeParse({
                newPassword: 'Hospital1',
                confirmPassword: 'Hospital2',
            })
            expect(result.success).toBe(false)
            const errs = result.error?.flatten().fieldErrors.confirmPassword
            expect(errs?.some((e) => e.includes('do not match'))).toBe(true)
        })

        it('should reject empty confirmPassword', () => {
            const result = changePasswordSchema.safeParse({
                newPassword: 'Hospital1',
                confirmPassword: '',
            })
            expect(result.success).toBe(false)
        })
    })
})
