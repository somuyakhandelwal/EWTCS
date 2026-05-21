import { TRIAGE_STATES, type TriageState } from './types'

const ER_ONLY_STATE_NAMES = new Set([
  'initial investigation',
  'drugs/test',
  'observation',
  'discharge process',
  'registration',
  'doctor assessment',
  'treatment/observation',
  'triage',
])

const ALLOWED_TRANSITIONS: Record<TriageState, TriageState[]> = {
  empty: ['initial_treatment'],
  initial_treatment: ['decision_made'],
  decision_made: ['cleaning'],
  cleaning: ['empty'],
}

export function isTriageState(value: string): value is TriageState {
  return TRIAGE_STATES.includes(value as TriageState)
}

export function isErOnlyStateName(value: string): boolean {
  return ER_ONLY_STATE_NAMES.has(value.trim().toLowerCase())
}

export function getAllowedTriageTransitions(fromState: TriageState): TriageState[] {
  return ALLOWED_TRANSITIONS[fromState]
}

export function validateTriageTransition(
  fromState: TriageState,
  toState: TriageState
): { success: true } | { success: false; error: string } {
  if (!isTriageState(fromState) || !isTriageState(toState)) {
    return { success: false, error: 'Only approved triage states are allowed.' }
  }

  if (!ALLOWED_TRANSITIONS[fromState].includes(toState)) {
    return {
      success: false,
      error: `Cannot move triage bed from ${fromState} to ${toState}.`,
    }
  }

  return { success: true }
}
