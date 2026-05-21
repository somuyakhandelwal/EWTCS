'use server'
import { getAllStages, getBedsWithElapsedTime } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import type { BedGridData } from '../types/bed'
import { getUserWard } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { getStageTransitionMap } from '../lib/stage-validation'
import type { UserRole } from '../lib/stage-validation-types'
import { getGlobalThresholdMs, getGlobalEscalationThresholdMs } from '@/shared/lib/threshold'
import { perfStart, perfEnd, logPerf, PERF_SLA } from '@/shared/lib/perf-monitor'
import { getTriageWardIds } from '../lib/triage-wards'

export type BedAreaView = 'all' | 'emergency' | 'triage'


function filterBedsByArea(data: BedGridData['beds'], areaView: BedAreaView, triageWardIds: Set<string>) {
  if (areaView === 'all' || triageWardIds.size === 0) {
    return data
  }

  if (areaView === 'triage') {
    return data.filter((bed) => bed.wardId && triageWardIds.has(bed.wardId))
  }

  return data.filter((bed) => !bed.wardId || !triageWardIds.has(bed.wardId))
}

/**
 * Get all beds with current status and elapsed time.
 * areaView='emergency' excludes triage-ward beds; areaView='triage' includes only triage-ward beds.
 */
export async function getBedGridData(areaView: BedAreaView = 'all'): Promise<{
  success: boolean
  data?: BedGridData
  error?: string
}>
{
  try {
    // Auth guard: all roles can fetch the dashboard, but must be authenticated
    const session = await requireRole(['nurse', 'supervisor', 'admin', 'housekeeping', 'doctor'])

    // EPIC 13: track end-to-end latency for Dashboard SLA monitoring (<2 s).
    const perfMark = perfStart()

    logger.debug('Fetching bed grid data')

    const [delayThresholdMs, escalationThresholdMs] = await Promise.all([
      getGlobalThresholdMs(),
      getGlobalEscalationThresholdMs(),
    ])

    // Fetch beds, stages, transition map, and caller's ward assignment in parallel.
    // 
    // TECHNICAL CACHE COMPATIBILITY NOTE:
    // Next.js `unstable_cache` / `withCache` wraps `getTriageWardIds` and serializes the returned
    // structures to JSON on disk/memory. Since native JavaScript structures like `Set` do not
    // survive JSON serialization (they are converted to empty objects `{}` without prototype methods),
    // we fetch a plain array `triageWardIdsRaw` from the cached call and subsequently construct a new,
    // real JavaScript `Set` inside this non-cached caller. This completely avoids runtime exceptions
    // like `triageWardIds.has is not a function`.
    const [allBeds, stages, transitionMapRaw, userWard, triageWardIdsRaw] = await Promise.all([
      getBedsWithElapsedTime(delayThresholdMs, escalationThresholdMs),
      getAllStages(),
      getStageTransitionMap(session.role as UserRole),
      getUserWard(session.userId),
      getTriageWardIds(),
    ])

    // Reconstruct the Set from the raw cached array to restore all prototype methods like Set.has().
    const triageWardIds = new Set(triageWardIdsRaw)

    // Ward-scope the bed list for nurses and housekeeping.
    // Admins/supervisors see every ward; floater nurses (no ward assigned) also see all.
    const wardScopedRoles = new Set<string>(['nurse', 'housekeeping'])
    
    // US-16.2: Ensure nurses can always view the global triage area, even if restricted to an ER ward
    let wardScopedBeds = allBeds;
    if (wardScopedRoles.has(session.role) && userWard) {
      if (areaView === 'triage') {
        // In Triage view, do not restrict by userWard, as triage is a shared intake area
        wardScopedBeds = allBeds;
      } else {
        // In Emergency view or global view, restrict to their assigned ward
        wardScopedBeds = allBeds.filter(b => b.wardId === userWard || b.isVirtual || b.isTemporary);
      }
    }

    const beds = filterBedsByArea(wardScopedBeds, areaView, triageWardIds)

    // =========================================================================
    // TRANSITION VALIDATION PARITY AND OFFLINE CACHE STORAGE PREPARATION:
    // =========================================================================
    // US-16.2: To support offline clinicians, we serialize a pre-computed stage 
    // transition map. The client stores this in localStorage to validate stage 
    // transitions without an active network connection.
    // 
    // The query cache uses Next.js `unstable_cache` which serializes structures
    // via JSON. Therefore, `transitionMapRaw` is populated as a plain Record
    // instead of a Map, so we perform direct object property lookups `transitionMapRaw[fromKey]`.
    //
    // Backwards Compatibility / Parity Rules:
    // For every (fromStageId, toStageId) pair that has NO explicit database row,
    // the online validation engine treats the transition as "allowed by default".
    // To match this online behavior in offline mode, we compute all stages that
    // have NO matching rule and explicitly add them to the `allowed` array.
    const allStageIds = stages.map(s => s.id)
    const allFromKeys = [...allStageIds, 'null']
    const stageTransitionMap: BedGridData['stageTransitionMap'] = {}

    for (const fromKey of allFromKeys) {
      // Look up allowed/override/blocked sets from the plain JSON record
      const entry = transitionMapRaw[fromKey] ?? { allowed: [], requiresOverride: [], blocked: [] }
      const covered = new Set([...entry.allowed, ...entry.requiresOverride, ...entry.blocked])
      
      // Stages absent from the `covered` set have no DB rules defined → allowed by default
      const noRuleStages = allStageIds.filter(id => !covered.has(id))
      stageTransitionMap[fromKey] = {
        allowed: [...entry.allowed, ...noRuleStages],
        requiresOverride: entry.requiresOverride,
      }
    }
    // =========================================================================

    const bottleneckCount = beds.filter(b => b.isDispositionBottleneck).length
    const escalationCount = beds.filter(b => b.isEscalated).length

    const data: BedGridData = {
      beds,
      stages,
      delayThresholdMs,
      escalationThresholdMs,
      bottleneckCount,
      escalationCount,
      stageTransitionMap,
      // Carry the caller's ward ID into the cache so the offline layer can enforce
      // the same restriction without a network call (nurses only; undefined for admins)
      userWardId: wardScopedRoles.has(session.role) ? userWard : undefined,
    }

    logger.debug('Bed grid data fetched successfully', {
      bedCount: beds.length,
      stageCount: stages.length,
      areaView,
      triageWardCount: triageWardIds.size,
    })

    // EPIC 13: log latency sample — WARN is emitted if > 2 s SLA.
    logPerf('dashboard.getBedGridData', perfEnd(perfMark), PERF_SLA.DASHBOARD_MS)

    return {
      success: true,
      data,
    }
  } catch (error) {
    logger.error('Failed to fetch bed grid data', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bed grid data',
    }
  }
}

/**
 * Get only delayed beds (for filtering)
 */
export async function getDelayedBeds(): Promise<{
  success: boolean
  beds?: Awaited<ReturnType<typeof getBedsWithElapsedTime>>
  error?: string
}> {
  try {
    const [delayThresholdMs, escalationThresholdMs] = await Promise.all([
      getGlobalThresholdMs(),
      getGlobalEscalationThresholdMs(),
    ])
    const allBeds = await getBedsWithElapsedTime(delayThresholdMs, escalationThresholdMs)
    const delayedBeds = allBeds.filter(bed => bed.isDelayed)

    logger.info('Delayed beds fetched', { count: delayedBeds.length })
    return {
      success: true,
      beds: delayedBeds,
    }
  } catch (error) {
    logger.error('Failed to fetch delayed beds', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch delayed beds',
    }
  }
}

