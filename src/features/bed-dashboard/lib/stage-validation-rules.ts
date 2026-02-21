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

/** Resolve stage name by ID (null-safe) */
export async function getStageNameById(stageId: string | null): Promise<string | null> {
  if (!stageId) return null

  const result = await pool.query<{ name: string }>(
    `SELECT name FROM stages WHERE id = $1 AND is_active = true LIMIT 1`,
    [stageId]
  )

  return result.rows[0]?.name ?? null
}
