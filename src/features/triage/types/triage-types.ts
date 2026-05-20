/**
 * @file Defines the core types and constants for the Triage workflow.
 * EPIC 25: Separate Triage Area from Emergency Ward Workflow
 */

/**
 * Represents the distinct areas within the hospital workflow.
 */
export type WorkflowArea = 'ER' | 'TRIAGE';

/**
 * Defines the allowed stage names for the Triage area.
 * These are kept separate from ER stages to ensure workflow independence.
 */
export const TRIAGE_STAGES = {
  EMPTY: 'Triage Empty',
  INITIAL_TREATMENT: 'Triage Initial Treatment',
  DECISION_MADE: 'Triage Decision Made',
  CLEANING: 'Triage Cleaning',
} as const;

// Creates a type from the constant values for type safety.
export type TriageStage = (typeof TRIAGE_STAGES)[keyof typeof TRIAGE_STAGES];

/**
 * A set of the Triage stage names for quick lookups.
 */
export const TriageStageSet = new Set<string>(Object.values(TRIAGE_STAGES));
