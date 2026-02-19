// Stage Validation Consistency
// Epic 2: One-Click Stage Update System (US-2.2)
// Purpose: Consistency check for stage transition rules

import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'

/**
 * Validate that all current transition rules are consistent.
 * Run this during startup or validation checks.
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

    return { isValid: errors.length === 0, errors }
  } catch (error) {
    logger.error('Failed to validate transition rules consistency', error as Error)
    return {
      isValid: false,
      errors: ['Failed to run consistency check: ' + (error as Error).message],
    }
  }
}
