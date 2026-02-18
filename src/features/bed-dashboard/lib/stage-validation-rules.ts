// Stage Validation Rules
// Epic 2: One-Click Stage Update System (US-2.2)
// Purpose: Database queries for stage transition rules

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import type { TransitionRule, UserRole } from './stage-validation-types'

/**
 * Get the transition rule between two specific stages
 * Returns null if no explicit rule exists (defaults to allowed)
 */
export async function getTransitionRule(
  fromStageId: string | null,
  toStageId: string
): Promise<TransitionRule | null> {
  try {
    const result = await pool.query<TransitionRule>(
      `
      SELECT 
        from_stage_id as "fromStageId",
        to_stage_id as "toStageId",
        is_allowed as "isAllowed",
        requires_supervisor_override as "requiresSupervisorOverride",
        reason,
        description
      FROM stage_transitions
      WHERE 
        from_stage_id IS NOT DISTINCT FROM $1
        AND to_stage_id = $2
        AND is_active = true
      ORDER BY priority DESC
      LIMIT 1
      `,
      [fromStageId, toStageId]
    )

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    logger.error('Failed to get transition rule', error as Error)
    throw error
  }
}

/**
 * Get all valid next stages a user can transition to from current stage
 * Considers user role for supervisor override capabilities
 */
export async function getValidNextStages(
  currentStageId: string | null,
  userRole: UserRole
): Promise<string[]> {
  try {
    const result = await pool.query<{ toStageId: string }>(
      `
      SELECT DISTINCT to_stage_id as "toStageId"
      FROM stage_transitions
      WHERE 
        from_stage_id IS NOT DISTINCT FROM $1
        AND is_active = true
        AND (
          -- Allow unrestricted transitions
          is_allowed = true
          -- Allow supervisor override transitions if user is supervisor/admin
          OR (
            is_allowed = false 
            AND requires_supervisor_override = true
            AND ($2 = 'supervisor'::text OR $2 = 'admin'::text)
          )
        )
      `,
      [currentStageId, userRole]
    )

    return result.rows.map(r => r.toStageId)
  } catch (error) {
    logger.error('Failed to get valid next stages', error as Error)
    throw error
  }
}

/**
 * Get a map of all stages to their valid next stages for a specific user role
 * Useful for pre-computing valid transitions for UI rendering
 */
export async function getStageTransitionMap(
  userRole: UserRole
): Promise<Map<string, { allowed: string[]; requiresOverride: string[] }>> {
  try {
    const result = await pool.query<{
      fromStageId: string | null
      toStageId: string
      isAllowed: boolean
      requiresSupervisorOverride: boolean
    }>(
      `
      SELECT 
        from_stage_id as "fromStageId",
        to_stage_id as "toStageId",
        is_allowed as "isAllowed",
        requires_supervisor_override as "requiresSupervisorOverride"
      FROM stage_transitions
      WHERE is_active = true
      ORDER BY from_stage_id, priority DESC
      `,
      []
    )

    const map = new Map<string, { allowed: string[]; requiresOverride: string[] }>()

    for (const row of result.rows) {
      const key = row.fromStageId || 'null'
      if (!map.has(key)) {
        map.set(key, { allowed: [], requiresOverride: [] })
      }

      const entry = map.get(key)!

      if (row.isAllowed) {
        if (!entry.allowed.includes(row.toStageId)) {
          entry.allowed.push(row.toStageId)
        }
      } else if (
        row.requiresSupervisorOverride &&
        (userRole === 'supervisor' || userRole === 'admin')
      ) {
        if (!entry.requiresOverride.includes(row.toStageId)) {
          entry.requiresOverride.push(row.toStageId)
        }
      }
    }

    return map
  } catch (error) {
    logger.error('Failed to get stage transition map', error as Error)
    throw error
  }
}

/**
 * Validate that all current transition rules are consistent
 * Run this during startup or validation checks
 */
export async function validateTransitionRulesConsistency(): Promise<{
  isValid: boolean
  errors: string[]
}> {
  const errors: string[] = []

  try {
    // Check for rules that reference non-existent stages
    const orphanedRules = await pool.query<{ ruleId: string; fromStage: string; toStage: string }>(
      `
      SELECT 
        st.id as "ruleId",
        s1.name as "fromStage",
        s2.name as "toStage"
      FROM stage_transitions st
      LEFT JOIN stages s1 ON st.from_stage_id = s1.id
      LEFT JOIN stages s2 ON st.to_stage_id = s2.id
      WHERE 
        (st.from_stage_id IS NOT NULL AND s1.id IS NULL) OR
        s2.id IS NULL
      `
    )

    if (orphanedRules.rows.length > 0) {
      errors.push(
        `Found ${orphanedRules.rows.length} transition rules referencing non-existent stages`
      )
    }

    // Check for duplicate rules (should be prevented by unique constraint)
    const duplicates = await pool.query<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM (
        SELECT from_stage_id, to_stage_id, COUNT(*) as cnt
        FROM stage_transitions
        WHERE is_active = true
        GROUP BY from_stage_id, to_stage_id
        HAVING COUNT(*) > 1
      ) duplicates
      `
    )

    if (duplicates.rows.length > 0 && duplicates.rows[0].count > 0) {
      errors.push('Found duplicate stage transition rules')
    }

    logger.info('Stage transition rules consistency check', {
      isValid: errors.length === 0,
      errorCount: errors.length,
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  } catch (error) {
    logger.error('Failed to validate transition rules consistency', error as Error)
    return {
      isValid: false,
      errors: ['Failed to run consistency check: ' + (error as Error).message],
    }
  }
}
