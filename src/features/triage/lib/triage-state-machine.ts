/**
 * @file Implements the state machine for the Triage workflow.
 * EPIC 25: Separate Triage Area from Emergency Ward Workflow
 */

import { TRIAGE_STAGES, TriageStage, TriageStageSet } from '../types/triage-types';

// Defines the valid transitions for the Triage workflow.
// The key is the 'from' stage, and the value is a Set of allowed 'to' stages.
const triageTransitions = new Map<TriageStage, Set<TriageStage>>([
  [
    TRIAGE_STAGES.EMPTY,
    new Set([TRIAGE_STAGES.INITIAL_TREATMENT]),
  ],
  [
    TRIAGE_STAGES.INITIAL_TREATMENT,
    new Set([TRIAGE_STAGES.DECISION_MADE]),
  ],
  [
    TRIAGE_STAGES.DECISION_MADE,
    new Set([TRIAGE_STAGES.CLEANING]),
  ],
  [
    TRIAGE_STAGES.CLEANING,
    new Set([TRIAGE_STAGES.EMPTY]),
  ],
]);

/**
 * Validates if a transition between two Triage stages is allowed.
 *
 * @param fromStage The current stage name.
 * @param toStage The target stage name.
 * @returns An object with `isValid` and a `reason` if the transition is invalid.
 */
export function isValidTriageTransition(
  fromStage: string | null | undefined,
  toStage: string
): { isValid: boolean; reason?: string } {
  // 1. Ensure both stages are part of the Triage workflow.
  if (!TriageStageSet.has(toStage)) {
    return { isValid: false, reason: `Target stage "${toStage}" is not a valid Triage stage.` };
  }
  // fromStage can be null/undefined if the bed is new or in a weird state.
  // We allow transitioning to 'Triage Empty' from any non-triage state as a recovery mechanism.
  if (!fromStage || !TriageStageSet.has(fromStage)) {
    if (toStage === TRIAGE_STAGES.EMPTY) {
      return { isValid: true };
    }
    return {
      isValid: false,
      reason: `Origin stage "${fromStage}" is not a valid Triage stage.`,
    };
  }

  // 2. Check if the transition is defined in the state machine.
  const allowedTransitions = triageTransitions.get(fromStage as TriageStage);

  if (allowedTransitions?.has(toStage as TriageStage)) {
    return { isValid: true };
  }

  // 3. If no valid transition is found, provide a reason.
  const fromFriendly = fromStage.replace('Triage ', '');
  const toFriendly = toStage.replace('Triage ', '');
  const allowedFriendly = Array.from(allowedTransitions || [])
    .map(s => `"${s.replace('Triage ', '')}"`)
    .join(', ');

  const reason = `Cannot transition from "${fromFriendly}" to "${toFriendly}". Allowed transitions are: ${allowedFriendly || 'None'}.`;

  return { isValid: false, reason };
}
