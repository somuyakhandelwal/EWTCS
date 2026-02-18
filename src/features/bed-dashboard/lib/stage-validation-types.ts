// Stage Validation Types
// Epic 2: One-Click Stage Update System (US-2.2)
// Purpose: Type definitions for stage validation system

/**
 * Represents a transition rule from the database
 */
export interface TransitionRule {
  fromStageId: string | null
  toStageId: string
  isAllowed: boolean
  requiresSupervisorOverride: boolean
  reason: string | null
  description: string | null
}

/**
 * Result of validating a stage transition
 */
export interface TransitionValidationResult {
  isValid: boolean
  requiresSupervisorOverride: boolean
  reason: string // Why transition is invalid or why override is needed
  validNextStages: string[] // All valid stage IDs from current stage
}

/**
 * Stage categorization for transition display
 */
export interface StageCategories {
  allowed: string[] // Can transition directly without override
  requiresOverride: string[] // Can transition with supervisor override
  invalid: string[] // Cannot transition at all
}

/**
 * User role type for authorization
 */
export type UserRole = 'nurse' | 'supervisor' | 'admin'
