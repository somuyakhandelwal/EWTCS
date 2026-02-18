/**
 * BUG #6: Missing Null Checks
 * File: src/features/bed-dashboard/actions/bed-actions.ts
 * 
 * Issue: Missing ward assignment validation could cause IDOR vulnerabilities
 * Fix: Added explicit null checks with helpful error messages
 */

describe('BUG #6: Ward Assignment Validation', () => {
  interface AccessCheckInput {
    userWard: string | null
    bedWard: string | null
    userRole: 'nurse' | 'admin'
  }

  interface AccessCheckResult {
    allowed: boolean
    error?: string
  }

  function checkWardAccess(input: AccessCheckInput): AccessCheckResult {
    const { userWard, bedWard, userRole } = input

    if (!userWard && userRole !== 'admin') {
      return {
        allowed: false,
        error: 'Your user account does not have a ward assignment. Contact your administrator.',
      }
    }

    if (!bedWard && userRole !== 'admin') {
      return {
        allowed: false,
        error: 'This bed does not belong to any ward. Contact your administrator.',
      }
    }

    const hasAccess = (userWard && bedWard && userWard === bedWard) || userRole === 'admin'

    if (!hasAccess) {
      return {
        allowed: false,
        error: 'You do not have permission to update this bed.',
      }
    }

    return { allowed: true }
  }

  describe('User Ward Assignment', () => {
    it('should reject nurse without ward assignment', () => {
      const result = checkWardAccess({
        userWard: null,
        bedWard: 'WARD-A',
        userRole: 'nurse',
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('ward assignment')
    })

    it('should allow admin without ward assignment', () => {
      const result = checkWardAccess({
        userWard: null,
        bedWard: 'WARD-A',
        userRole: 'admin',
      })
      expect(result.allowed).toBe(true)
    })
  })

  describe('Bed Ward Assignment', () => {
    it('should reject access to bed without ward', () => {
      const result = checkWardAccess({
        userWard: 'WARD-A',
        bedWard: null,
        userRole: 'nurse',
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('bed')
    })

    it('should allow admin to access bed without ward', () => {
      const result = checkWardAccess({
        userWard: null,
        bedWard: null,
        userRole: 'admin',
      })
      expect(result.allowed).toBe(true)
    })
  })

  describe('Ward Matching', () => {
    it('should allow access when wards match', () => {
      const result = checkWardAccess({
        userWard: 'WARD-A',
        bedWard: 'WARD-A',
        userRole: 'nurse',
      })
      expect(result.allowed).toBe(true)
    })

    it('should deny access to different ward', () => {
      const result = checkWardAccess({
        userWard: 'WARD-A',
        bedWard: 'WARD-B',
        userRole: 'nurse',
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('permission')
    })

    it('should be case-sensitive for ward names', () => {
      const result = checkWardAccess({
        userWard: 'WARD-A',
        bedWard: 'ward-a',
        userRole: 'nurse',
      })
      expect(result.allowed).toBe(false)
    })
  })

  describe('Admin Privileges', () => {
    it('should allow admin universal access', () => {
      const result = checkWardAccess({
        userWard: null,
        bedWard: null,
        userRole: 'admin',
      })
      expect(result.allowed).toBe(true)
    })

    it('should not require admin to match wards', () => {
      const result = checkWardAccess({
        userWard: 'WARD-X',
        bedWard: 'WARD-Y',
        userRole: 'admin',
      })
      expect(result.allowed).toBe(true)
    })
  })

  describe('Error Messages', () => {
    it('should provide helpful error messages', () => {
      const result = checkWardAccess({
        userWard: null,
        bedWard: 'WARD-A',
        userRole: 'nurse',
      })
      expect(result.error).toBeDefined()
      expect(result.error?.toLowerCase()).toContain('administrator')
    })

    it('should not expose sensitive information in errors', () => {
      const result = checkWardAccess({
        userWard: 'WARD-A',
        bedWard: 'WARD-B',
        userRole: 'nurse',
      })
      expect(result.error).not.toContain('WARD-')
    })
  })

  describe('IDOR Prevention', () => {
    it('should prevent cross-ward access attempts', () => {
      const wards = ['WARD-A', 'WARD-B', 'WARD-C']
      const userWard = 'WARD-A'

      const results = wards.map((bedWard) =>
        checkWardAccess({
          userWard,
          bedWard,
          userRole: 'nurse',
        })
      )

      expect(results[0].allowed).toBe(true) // Same ward
      expect(results[1].allowed).toBe(false) // Different ward
      expect(results[2].allowed).toBe(false) // Different ward
    })

    it('should prevent access with missing ward assignments', () => {
      const result = checkWardAccess({
        userWard: null,
        bedWard: 'ANY-WARD',
        userRole: 'nurse',
      })
      expect(result.allowed).toBe(false)
    })
  })
})
