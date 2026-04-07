import type { StageCategories, UserRole } from './stage-validation-types'
import { getStageNamesByIds, getStageTransitionMap } from './stage-validation-rules'

function buildHousekeepingDecision(fromStageName: string | null, toStageName: string | null): boolean {
  const isStartCleaning = fromStageName === 'Discharge Process' && toStageName === 'Cleaning'
  const isCleaningComplete = fromStageName === 'Cleaning' && toStageName === 'Empty'
  return isStartCleaning || isCleaningComplete
}

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

export async function categorizeStandardStages(
  fromStageId: string | null,
  allStageIds: string[],
  userRole: UserRole
): Promise<StageCategories> {
  const transitionMap = await getStageTransitionMap(userRole)
  const fromKey = fromStageId || 'null'
  const entry = transitionMap.get(fromKey) ?? { allowed: [], requiresOverride: [], blocked: [] }

  const allowedSet = new Set(entry.allowed)
  const overrideSet = new Set(entry.requiresOverride)
  const blockedSet = new Set(entry.blocked)

  const allowed: string[] = []
  const requiresOverride: string[] = []
  const invalid: string[] = []

  for (const toStageId of allStageIds) {
    if (allowedSet.has(toStageId)) {
      allowed.push(toStageId)
      continue
    }

    if (overrideSet.has(toStageId)) {
      requiresOverride.push(toStageId)
      continue
    }

    if (blockedSet.has(toStageId)) {
      invalid.push(toStageId)
      continue
    }

    // No explicit DB rule = allowed by default (backward compatibility).
    allowed.push(toStageId)
  }

  return { allowed, requiresOverride, invalid }
}
