'use server'

import { getAllStages, getBedsWithElapsedTime } from '../lib/queries'
import { logger } from '@/shared/config/logger'
import type { BedGridData } from '../types/bed'
import { getUserWard } from '../lib/bed-queries'
import { requireRole } from '@/shared/lib/auth'
import { query } from '@/shared/lib/db'
import { getStageTransitionMap } from '../lib/stage-validation'
import type { UserRole } from '../lib/stage-validation-types'
import { getGlobalThresholdMs, getGlobalEscalationThresholdMs } from '@/shared/lib/threshold'
import { perfStart, perfEnd, logPerf, PERF_SLA } from '@/shared/lib/perf-monitor'

export type BedAreaView = 'all' | 'emergency' | 'triage'

async function getTriageWardIds(): Promise<Set<string>> {
  const result = await query<{ id: string }>(
    `
    SELECT id
    FROM wards
    WHERE is_active = true
      AND (
        UPPER(code) = 'TRIAGE'
        OR LOWER(name) LIKE '%triage%'
      )
    `
  )

  return new Set(result.rows.map((row) => row.id))
}

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

    // Fetch beds, stages, transition map, and caller's ward assignment in parallel
    // US-16.2: stageTransitionMap is cached with BedGridData so offline nurses see stage options
    const [allBeds, stages, transitionMapRaw, userWard, triageWardIds] = await Promise.all([
      getBedsWithElapsedTime(delayThresholdMs, escalationThresholdMs),
      getAllStages(),
      getStageTransitionMap(session.role as UserRole),
      getUserWard(session.userId),
      getTriageWardIds(),
    ])

    // Ward-scope the bed list for nurses and housekeeping.
    // Admins/supervisors see every ward; floater nurses (no ward assigned) also see all.
    const wardScopedRoles = new Set<string>(['nurse', 'housekeeping'])
    const wardScopedBeds =
      wardScopedRoles.has(session.role) && userWard
        ? allBeds.filter(b => b.wardId === userWard || b.isVirtual || b.isTemporary)
        : allBeds

    const beds = filterBedsByArea(wardScopedBeds, areaView, triageWardIds)

    // Convert Map → plain Record (JSON-serialisable for localStorage cache).
    // US-16.2: replicate the online "no rule = allowed by default" behaviour so the
    // offline transition map matches what categorizeStagesForTransition returns online.
    // For every (fromStageId, toStageId) pair that has NO explicit DB row, the online
    // path allows the transition.  We identify those here by comparing each stage against
    // the explicitly-covered set (allowed + requiresOverride + blocked) and add them to
    // allowed, keeping parity with the runtime validation logic.
    const allStageIds = stages.map(s => s.id)
    const allFromKeys = [...allStageIds, 'null']
    const stageTransitionMap: BedGridData['stageTransitionMap'] = {}

    for (const fromKey of allFromKeys) {
      const entry = transitionMapRaw.get(fromKey) ?? { allowed: [], requiresOverride: [], blocked: [] }
      const covered = new Set([...entry.allowed, ...entry.requiresOverride, ...entry.blocked])
      // Stages absent from `covered` have no DB rule → allowed by default (matches online path)
      const noRuleStages = allStageIds.filter(id => !covered.has(id))
      stageTransitionMap[fromKey] = {
        allowed: [...entry.allowed, ...noRuleStages],
        requiresOverride: entry.requiresOverride,
      }
    }

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

