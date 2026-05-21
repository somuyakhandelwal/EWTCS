/**
 * ============================================================================
 * EWTCS CLINICAL AND HOUSEKEEPING WORKFLOW STAGE CATEGORIZATION SERVICE
 * ============================================================================
 * 
 * CORE RESPONSIBILITY:
 * This service takes a clinical patient's current bed stage and pre-categorizes all
 * possible target stages into three distinct operational buckets for the UI:
 * 
 *   1. Allowed Transitions:
 *      Transitions that standard clinicians (nurses, doctors, triagists) can execute
 *      with a single click without any supervisor approval.
 * 
 *   2. Override Required Transitions:
 *      Transitions that violate default workflow rules but are permitted if a
 *      supervisor or administrator provides explicit credentials (bypass overrides).
 * 
 *   3. Invalid / Blocked Transitions:
 *      Transitions that are clinically unsafe or physically impossible under any
 *      ordinary conditions (such as moving from Empty to Cleaning, or Discharge to ER Intake).
 *      These are completely disabled in the UI.
 * 
 * ----------------------------------------------------------------------------
 * CLINICAL STAGES DESCRIPTION AND PROTOCOL ENFORCEMENT:
 * Each clinical stage represents a critical milestone in patient care:
 *   - ER Intake: Patient arrival and registration in the emergency ward.
 *   - Triage: Initial nurse assessment to prioritize care based on urgency.
 *   - Doctor Assessment: Detailed medical examination and diagnosis by a physician.
 *   - Treatment / Observation: Live care, monitoring, and therapy delivery.
 *   - Discharge Process: Preparing the patient for release or ward transfer.
 *   - Cleaning: Environmental service cleaning and sanitize step.
 *   - Empty: The bed is completely empty and ready to accept a new intake.
 * 
 * ----------------------------------------------------------------------------
 * DELAY THRESHOLDS AND AUTOMATIC ESCALATION PROTOCOLS:
 * The EWTCS system actively monitors patient dwell times in each stage:
 *   - Warning Delay Threshold: Emits UI warnings when dwell time exceeds safety metrics.
 *   - Supervisor Escalation Threshold: Automatically marks the bed as escalated if
 *     delays persist. Transitions from an escalated state to another clinical stage
 *     might require audit-logged supervisor sign-offs.
 * 
 * ----------------------------------------------------------------------------
 * CLINICAL VS HOUSEKEEPING SEPARATION OF CONCERNS:
 * To optimize patient throughput and keep clinical tasks separate from environmental
 * services, this service splits validation into two separate logical pipelines:
 * 
 *   A. Housekeeping Pipeline (categorizeHousekeepingStages):
 *      Housekeepers are restricted strictly to environmental services stages:
 *        - "Discharge Process" -> "Cleaning" (Start cleaning action)
 *        - "Cleaning" -> "Empty" (Mark as clean/ready action)
 *      All other transitions are classified as invalid. This prevents housekeeping staff
 *      from accidentally shifting patients into active clinical stages like Triage or ICU.
 * 
 *   B. Standard Clinical Pipeline (categorizeStandardStages):
 *      Clinicians and admins are allowed to execute clinical transitions governed by rules loaded
 *      from the `stage_transitions` database catalog.
 * 
 * ----------------------------------------------------------------------------
 * SERVICING MEMORY OR SERIALIZATION ANOMALIES (EPIC 13 UNSTABLE_CACHE RESOLUTION):
 * To guarantee sub-second dashboard rendering, transition mappings are loaded via
 * cached queries wrapped in Next.js `unstable_cache`. Because Next.js serializes the
 * cached return data through JSON:
 *   - The transition map is returned as a plain Record<string, StageCategoriesRaw> rather than Map.
 *   - Map prototype functions (like `.get()`) do not survive JSON translation.
 *   - We perform direct object key access (`transitionMap[fromKey]`) to prevent TypeError crashes.
 * 
 * ----------------------------------------------------------------------------
 * DEFAULTS AND BACKWARD COMPATIBILITY:
 * In accordance with EWTCS specifications:
 *   - "No explicit rule in the database = Allowed by default."
 *   - If the fromStageId does not match any row in the `stage_transitions` configuration table,
 *     the transition to any other stage is automatically allowed to prevent workflow lockouts.
 */

import type { StageCategories, UserRole } from './stage-validation-types'
import { getStageNamesByIds, getStageTransitionMap } from './stage-validation-rules'
/**
 * Validates whether a housekeeping staff member can perform a specific state transition.
 * 
 * @param fromStageName - The human-readable name of the current stage.
 * @param toStageName - The human-readable name of the targeted transition stage.
 * @returns True if the transition is allowed in the housekeeping workflow; false otherwise.
 */
function buildHousekeepingDecision(fromStageName: string | null, toStageName: string | null): boolean {
  const isStartCleaning = fromStageName === 'Discharge Process' && toStageName === 'Cleaning'
  const isCleaningComplete = fromStageName === 'Cleaning' && toStageName === 'Empty'
  return isStartCleaning || isCleaningComplete
}
/**
 * Pre-categorizes stages for housekeeping staff, restricting them exclusively to the EVS cleaning cycle.
 * 
 * @param fromStageId - The current stage ID of the bed.
 * @param allStageIds - List of all possible stage IDs configured in the system.
 * @returns An object containing the allowed, overrideRequired, and invalid stage lists.
 */
export async function categorizeHousekeepingStages(
  fromStageId: string | null,
  allStageIds: string[]
): Promise<StageCategories> {
  const uniqueStageIds = Array.from(
    new Set([fromStageId, ...allStageIds].filter((id): id is string => Boolean(id)))
  )

  const stageNameMap = await getStageNamesByIds(uniqueStageIds)
  const fromStageName = fromStageId ? stageNameMap.get(fromStageId) ?? null : null

  const allowed: string[] = []
  const invalid: string[] = []

  for (const toStageId of allStageIds) {
    const toStageName = stageNameMap.get(toStageId) ?? null
    if (buildHousekeepingDecision(fromStageName, toStageName)) {
      allowed.push(toStageId)
    } else {
      invalid.push(toStageId)
    }
  }
  return {
    allowed,
    requiresOverride: [],
    invalid,
  }
}
/**
 * Pre-categorizes clinical stages for clinicians and admins based on pre-compiled database rules.
 * 
 * @param fromStageId - The current stage ID of the bed.
 * @param allStageIds - List of all possible stage IDs configured in the system.
 * @param userRole - The role of the executing clinician (nurse, supervisor, admin, doctor).
 * @returns An object containing the allowed, overrideRequired, and invalid stage lists.
 */
/**
 * Pre-categorizes clinical stages for clinicians and admins based on pre-compiled database rules.
 * 
 * DESIGN RATIONALE:
 * The UI must render different visual states for next stage options. To achieve sub-second
 * responsiveness, the client receives a pre-categorized bucket of stages.
 * 
 * This function performs the following categorization:
 * 1. Checks `allowed` set: If present, the transition is fully allowed for this user's role.
 * 2. Checks `requiresOverride` set: If present, a supervisor passcode or bypass override is required.
 * 3. Checks `blocked` set: If present, the transition is explicitly disabled in the system.
 * 4. Fallback default: If a stage is absent from all explicit config buckets, it is treated
 *    as allowed by default (backward compatible design).
 * 
 * @param fromStageId - The current stage ID of the bed.
 * @param allStageIds - List of all possible stage IDs configured in the system.
 * @param userRole - The role of the executing clinician (nurse, supervisor, admin, doctor).
 * @returns An object containing the allowed, overrideRequired, and invalid stage lists.
 */
export async function categorizeStandardStages(
  fromStageId: string | null,
  allStageIds: string[],
  userRole: UserRole
): Promise<StageCategories> {
  // 1. Fetch the cached role-based transition map from the DB query cache
  const transitionMap = await getStageTransitionMap(userRole)
  const fromKey = fromStageId || 'null'
  // 2. Perform property-lookup since next unstable_cache JSON-serializes the record
  const entry = transitionMap[fromKey] ?? { allowed: [], requiresOverride: [], blocked: [] }
  // 3. Construct lookup Sets for fast, constant-time O(1) membership resolution
  const allowedSet = new Set(entry.allowed)
  const overrideSet = new Set(entry.requiresOverride)
  const blockedSet = new Set(entry.blocked)
  // 4. Initialize empty destination buckets for stage categorization
  const allowed: string[] = []
  const requiresOverride: string[] = []
  const invalid: string[] = []
  // 5. Iterate over every defined stage in the system to determine its state
  for (const toStageId of allStageIds) {
    // Check Case A: Is the target stage explicitly marked as allowed?
    if (allowedSet.has(toStageId)) {
      allowed.push(toStageId)
      continue
    }
    // Check Case B: Does the target stage require a supervisor override bypass?
    if (overrideSet.has(toStageId)) {
      requiresOverride.push(toStageId)
      continue
    }
    // Check Case C: Is the transition explicitly blocked/forbidden?
    if (blockedSet.has(toStageId)) {
      invalid.push(toStageId)
      continue
    }
    // Default Fallback Case: If no explicit DB transition rule is found for this target stage,
    // we treat it as allowed by default. This maintains backward compatibility with legacy clinical
    // workflows that might not have explicit database entries in the `stage_transitions` table.
    allowed.push(toStageId)
  }
  // 6. Return the finalized categorized stage buckets to the caller
  return { 
    allowed, 
    requiresOverride, 
    invalid 
  }
}
