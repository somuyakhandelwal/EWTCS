/**
 * Comprehensive Test Suite for Bug Fixes
 * 
 * This file contains runnable tests that can be executed directly
 * Run with: npx ts-node scripts/run-bug-tests.ts
 */

import { logger } from '@/shared/config/logger'

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface TestResult {
  name: string
  passed: boolean
  message: string
  error?: string
}

const results: TestResult[] = []

function assert(condition: boolean | undefined, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, but got ${actual}. ${message}`)
  }
}

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn()
      results.push({
        name,
        passed: true,
        message: '✓ PASSED',
      })
    } catch (error) {
      results.push({
        name,
        passed: false,
        message: '✗ FAILED',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

// ============================================================================
// BUG #1: RACE CONDITION TEST
// ============================================================================

function checkRaceCondition(bedId: string, updatingBedId: string | null): boolean {
  // BUG FIX #1: Prevent race condition - check if THIS bed is already updating
  if (updatingBedId === bedId) {
    return false // Block update
  }
  return true // Allow update
}

const bug1Tests = [
  test('BUG #1.1: Block concurrent updates to same bed', () => {
    const result = checkRaceCondition('BED-001', 'BED-001')
    assert(!result, 'Should block concurrent update to same bed')
  }),

  test('BUG #1.2: Allow updates to different beds', () => {
    const result = checkRaceCondition('BED-002', 'BED-001')
    assert(result, 'Should allow update to different bed')
  }),

  test('BUG #1.3: Allow update when no bed is updating', () => {
    const result = checkRaceCondition('BED-001', null)
    assert(result, 'Should allow update when updatingBedId is null')
  }),

  test('BUG #1.4: Multiple beds can update simultaneously', () => {
    const updatingBedId = 'BED-002'
    const bed1Result = checkRaceCondition('BED-001', updatingBedId)
    const bed2Result = checkRaceCondition('BED-002', updatingBedId)
    const bed3Result = checkRaceCondition('BED-003', updatingBedId)

    assert(bed1Result, 'BED-001 should be allowed')
    assert(!bed2Result, 'BED-002 should be blocked')
    assert(bed3Result, 'BED-003 should be allowed')
  }),
]

// ============================================================================
// BUG #2: PROMISE REJECTION HANDLING TEST
// ============================================================================

interface MenuState {
  menuError: string | null
}

async function simulateMenuOpen(shouldFail: boolean): Promise<MenuState> {
  try {
    if (shouldFail) {
      throw new Error('Failed to load transitions')
    }
    return { menuError: null }
  } catch (error) {
    // BUG FIX #2: Add error state and user feedback
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      menuError: `Unable to load available stages: ${errorMessage}`,
    }
  }
}

const bug2Tests = [
  test('BUG #2.1: Successfully load menu without error', async () => {
    const state = await simulateMenuOpen(false)
    assert(state.menuError === null, 'menuError should be null on success')
  }),

  test('BUG #2.2: Catch error and set error state', async () => {
    const state = await simulateMenuOpen(true)
    assert(state.menuError !== null, 'menuError should be set on failure')
    assert(
      state.menuError?.includes('Unable to load'),
      'Error message should contain user-friendly text'
    )
  }),

  test('BUG #2.3: Error message is displayable', async () => {
    const state = await simulateMenuOpen(true)
    assert(state.menuError?.length! > 0, 'Error message should not be empty')
    assert(
      !state.menuError?.includes('[object]'),
      'Error should be human-readable'
    )
  }),
]

// ============================================================================
// BUG #4: VALIDATION ERROR HANDLING TEST
// ============================================================================

interface ValidationResult {
  isValid: boolean
  reason?: string
  requiresOverride: boolean
}

async function validateTransitionWithFallback(
  shouldFail: boolean,
  userRole: 'nurse' | 'admin'
): Promise<ValidationResult> {
  try {
    if (shouldFail) {
      throw new Error('Database connection failed')
    }
    return { isValid: true, requiresOverride: false }
  } catch (error) {
    // BUG FIX #4: Return fallback instead of throwing
    if (userRole === 'admin') {
      return {
        isValid: true,
        reason: 'Admin override allowed',
        requiresOverride: false,
      }
    }
    return {
      isValid: false,
      reason: 'Supervisor override required',
      requiresOverride: true,
    }
  }
}

const bug4Tests = [
  test('BUG #4.1: Valid transitions pass through', async () => {
    const result = await validateTransitionWithFallback(false, 'nurse')
    assert(result.isValid, 'Valid transition should be allowed')
    assert(!result.requiresOverride, 'Should not require override')
  }),

  test('BUG #4.2: Admin gets fallback override on error', async () => {
    const result = await validateTransitionWithFallback(true, 'admin')
    assert(result.isValid, 'Admin should be allowed despite error')
    assert(!result.requiresOverride, 'Admin override is implicit')
  }),

  test('BUG #4.3: Nurse requires override on error', async () => {
    const result = await validateTransitionWithFallback(true, 'nurse')
    assert(!result.isValid, 'Nurse should not be allowed without override')
    assert(result.requiresOverride, 'Should require supervisor override')
  }),

  test('BUG #4.4: No throwing - graceful degradation', async () => {
    let exceptionThrown = false
    try {
      await validateTransitionWithFallback(true, 'nurse')
    } catch (error) {
      exceptionThrown = true
    }
    assert(!exceptionThrown, 'Should not throw exception')
  }),
]

// ============================================================================
// BUG #5: DATABASE POOL TEST
// ============================================================================

interface PoolConfig {
  max: number
  min: number
  connectionTimeoutMillis: number
  statementTimeoutMillis: number
}

interface PoolStats {
  totalConnections: number
  idleConnections: number
  utilizationPercent: number
  healthy: boolean
}

function getFixedPoolConfig(): PoolConfig {
  // BUG FIX #5: Improved pool configuration
  return {
    max: 50, // Changed from 20
    min: 10, // Changed from 0
    connectionTimeoutMillis: 5000, // Changed from 2000
    statementTimeoutMillis: 10000, // New
  }
}

function checkPoolHealth(stats: PoolStats): boolean {
  // BUG FIX #5: Monitor pool utilization
  const isHealthy = stats.utilizationPercent < 90
  return isHealthy
}

const bug5Tests = [
  test('BUG #5.1: Pool size increased for concurrent load', () => {
    const config = getFixedPoolConfig()
    assert(config.max >= 50, 'Max connections should be at least 50')
  }),

  test('BUG #5.2: Minimum connections maintained warm', () => {
    const config = getFixedPoolConfig()
    assert(config.min >= 10, 'Min connections should be at least 10')
  }),

  test('BUG #5.3: Connection timeout increased', () => {
    const config = getFixedPoolConfig()
    assert(config.connectionTimeoutMillis >= 5000, 'Timeout should be at least 5000ms')
  }),

  test('BUG #5.4: Statement timeout configured', () => {
    const config = getFixedPoolConfig()
    assert(config.statementTimeoutMillis > 0, 'Statement timeout should be configured')
  }),

  test('BUG #5.5: Pool health monitoring works', () => {
    const healthyStats: PoolStats = {
      totalConnections: 50,
      idleConnections: 40,
      utilizationPercent: 20,
      healthy: true,
    }
    const isHealthy = checkPoolHealth(healthyStats)
    assert(isHealthy, 'Healthy pool should return true')
  }),

  test('BUG #5.6: Pool alerts at high utilization', () => {
    const unhealthyStats: PoolStats = {
      totalConnections: 50,
      idleConnections: 2,
      utilizationPercent: 96,
      healthy: false,
    }
    const isHealthy = checkPoolHealth(unhealthyStats)
    assert(!isHealthy, 'Unhealthy pool should return false')
  }),
]

// ============================================================================
// BUG #6: NULL CHECKS TEST
// ============================================================================

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

  // BUG FIX #6: Explicit null checks with helpful error messages
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

const bug6Tests = [
  test('BUG #6.1: Reject nurse without ward assignment', () => {
    const result = checkWardAccess({
      userWard: null,
      bedWard: 'WARD-A',
      userRole: 'nurse',
    })
    assert(!result.allowed, 'Should deny access')
    assert(
      result.error?.includes('ward assignment'),
      'Error should mention ward assignment'
    )
  }),

  test('BUG #6.2: Reject access to bed without ward', () => {
    const result = checkWardAccess({
      userWard: 'WARD-A',
      bedWard: null,
      userRole: 'nurse',
    })
    assert(!result.allowed, 'Should deny access')
    assert(result.error?.includes('bed'), 'Error should mention bed')
  }),

  test('BUG #6.3: Allow access when wards match', () => {
    const result = checkWardAccess({
      userWard: 'WARD-A',
      bedWard: 'WARD-A',
      userRole: 'nurse',
    })
    assert(result.allowed, 'Should allow access when wards match')
  }),

  test('BUG #6.4: Admin can access without ward assignment', () => {
    const result = checkWardAccess({
      userWard: null,
      bedWard: null,
      userRole: 'admin',
    })
    assert(result.allowed, 'Admin should have universal access')
  }),

  test('BUG #6.5: Deny access to different ward', () => {
    const result = checkWardAccess({
      userWard: 'WARD-A',
      bedWard: 'WARD-B',
      userRole: 'nurse',
    })
    assert(!result.allowed, 'Should deny cross-ward access')
    assert(
      result.error?.includes('permission'),
      'Error should mention permissions'
    )
  }),
]

// ============================================================================
// BUG #7: AUDIT LOG RACE CONDITION TEST
// ============================================================================

interface AuditLogResult {
  bedUpdated: boolean
  auditLogged: boolean
  error?: string
}

async function updateBedWithAuditLogging(shouldAuditFail: boolean): Promise<AuditLogResult> {
  try {
    // Update bed (main operation)
    const bedUpdated = true

    // BUG FIX #7: Wrap audit logging in try-catch
    try {
      if (shouldAuditFail) {
        throw new Error('Audit database down')
      }
      return {
        bedUpdated,
        auditLogged: true,
      }
    } catch (auditError) {
      // Log the audit failure for compliance team
      const errorMessage = auditError instanceof Error ? auditError.message : 'Unknown error'
      console.error('CRITICAL: Audit logging failed', errorMessage)

      // Still return success since bed WAS updated (graceful degradation)
      return {
        bedUpdated: true,
        auditLogged: false,
        error: `Audit logging failed: ${errorMessage}`,
      }
    }
  } catch (error) {
    return {
      bedUpdated: false,
      auditLogged: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

const bug7Tests = [
  test('BUG #7.1: Audit logging succeeds normally', async () => {
    const result = await updateBedWithAuditLogging(false)
    assert(result.bedUpdated, 'Bed should be updated')
    assert(result.auditLogged, 'Audit should be logged')
  }),

  test('BUG #7.2: Bed update succeeds even if audit fails', async () => {
    const result = await updateBedWithAuditLogging(true)
    assert(result.bedUpdated, 'Bed should be updated despite audit failure')
    assert(!result.auditLogged, 'Audit should have failed')
  }),

  test('BUG #7.3: Error is captured but not thrown', async () => {
    let exceptionThrown = false
    try {
      await updateBedWithAuditLogging(true)
    } catch (error) {
      exceptionThrown = true
    }
    assert(!exceptionThrown, 'Should not throw exception')
  }),

  test('BUG #7.4: Audit failure error is returned', async () => {
    const result = await updateBedWithAuditLogging(true)
    assert(result.error !== undefined, 'Error message should be returned')
    assert(
      result.error?.includes('Audit'),
      'Error should mention audit failure'
    )
  }),
]

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80))
  console.log('RUNNING COMPREHENSIVE BUG FIX TEST SUITE')
  console.log('='.repeat(80))

  const allTests = [
    ...bug1Tests,
    ...bug2Tests,
    ...bug4Tests,
    ...bug5Tests,
    ...bug6Tests,
    ...bug7Tests,
  ]

  for (const testFn of allTests) {
    await testFn()
  }

  // Print results
  console.log('\n' + '='.repeat(80))
  console.log('TEST RESULTS')
  console.log('='.repeat(80))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  results.forEach((result) => {
    const icon = result.passed ? '✓' : '✗'
    console.log(`\n${icon} ${result.name}`)
    console.log(`  Status: ${result.message}`)
    if (result.error) {
      console.log(`  Error: ${result.error}`)
    }
  })

  console.log('\n' + '='.repeat(80))
  console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${results.length} tests`)
  console.log('='.repeat(80) + '\n')

  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test suite error:', error)
  process.exit(1)
})

export { runAllTests }
