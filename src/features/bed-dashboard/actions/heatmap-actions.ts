'use server'

// Staffing Heatmap Server Actions
// EPIC 10: Management Report Dashboard
// Only supervisors and admins may access this data.

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getHeatmapData, getHeatmapCellDetail } from '../lib/heatmap-queries'
import type {
  HeatmapData,
  HeatmapDrillDownRecord,
  HeatmapFilters,
} from '../types/heatmap.types'

/**
 * Fetch the full 7×24 heatmap dataset (sparse: only non-zero cells returned).
 * Enriched with maxCount and totalAdmissions for normalisation on the client.
 */
export async function fetchHeatmapData(
  filters: HeatmapFilters = {}
): Promise<{ success: boolean; data?: HeatmapData; error?: string }> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const cells = await getHeatmapData(filters.startDate, filters.endDate)
    const maxCount       = cells.reduce((max, c) => Math.max(max, c.count), 0)
    const totalAdmissions = cells.reduce((sum, c) => sum + c.count, 0)

    logger.info('Fetched staffing heatmap data', {
      userId: session.userId,
      cellCount: cells.length,
      totalAdmissions,
    })

    return {
      success: true,
      data: {
        cells,
        maxCount,
        totalAdmissions,
        dateRange: {
          start: filters.startDate ?? null,
          end:   filters.endDate   ?? null,
        },
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch heatmap data'
    logger.error('Failed to fetch staffing heatmap data', error as Error)
    return { success: false, error: message }
  }
}

/**
 * Fetch individual admission records for a specific DOW × hour cell.
 * Drives the interactive drill-down modal.
 */
export async function fetchHeatmapCellDetail(
  dayOfWeek: number,
  hourOfDay: number,
  filters: HeatmapFilters = {}
): Promise<{ success: boolean; data?: HeatmapDrillDownRecord[]; error?: string }> {
  try {
    const session = await requireRole(['supervisor', 'admin'])

    const records = await getHeatmapCellDetail(
      dayOfWeek,
      hourOfDay,
      filters.startDate,
      filters.endDate
    )

    logger.info('Fetched heatmap cell drill-down', {
      userId: session.userId,
      dayOfWeek,
      hourOfDay,
      count: records.length,
    })

    return { success: true, data: records }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cell details'
    logger.error('Failed to fetch heatmap cell detail', error as Error)
    return { success: false, error: message }
  }
}
