'use server'
// Export Server Actions — EPIC 11 (US-11.2)
// Unified server actions that fetch data and return CSV strings for the
// management-report sections that didn't previously have CSV export.
//
// All actions require supervisor / admin / auditor role (mirrors the read
// actions they wrap). Auditors are allowed because export is a read operation.

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import { getPatientCountSummary } from '@/features/management-report/lib/patient-count-queries'
import { getDelayedPatientsSummary } from '@/features/management-report/lib/delayed-patients-queries'
import { getBedPerformanceReport } from '@/features/management-report/lib/bed-performance-queries'
import { getStageDelayReport } from '@/features/management-report/lib/stage-delay-queries'
import {
  generatePatientCountCSV,
  generateDelayedPatientsCSV,
  generateBedPerformanceCSV,
  generateStageDelayCSV,
} from '../lib/csv-utils'
import type { CsvExportResult } from '../types/export.types'

// ---------------------------------------------------------------------------
// Shared date normaliser
// ---------------------------------------------------------------------------

function parseDate(d: Date | string, fallback?: Date): Date {
  if (d instanceof Date) return d
  const parsed = new Date(d)
  if (!isNaN(parsed.getTime())) return parsed
  return fallback ?? new Date()
}

// ---------------------------------------------------------------------------
// US-10.1 — Patient Count CSV
// ---------------------------------------------------------------------------

export async function exportPatientCountCSV(params: {
  startDate: Date | string
  endDate: Date | string
  shiftId?: string | null
  rangeLabel?: string
}): Promise<CsvExportResult> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const start = parseDate(params.startDate)
    const end = parseDate(params.endDate)
    const rangeLabel = params.rangeLabel ?? `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`

    if (start > end) return { success: false, error: 'Start date must be before end date' }

    const summary = await getPatientCountSummary(start, end, params.shiftId ?? null)
    const csv = generatePatientCountCSV(summary, rangeLabel)

    logger.info('Exported patient count CSV', {
      userId: session.userId,
      total: summary.totalPatients,
      rangeLabel,
    })

    return { success: true, data: csv }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export patient count data'
    logger.error('exportPatientCountCSV failed', error as Error)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// US-10.3 — Delayed Patients % CSV
// ---------------------------------------------------------------------------

export async function exportDelayedPatientsCSV(params: {
  startDate: Date | string
  endDate: Date | string
  shiftId?: string | null
  rangeLabel?: string
}): Promise<CsvExportResult> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const start = parseDate(params.startDate)
    const end = parseDate(params.endDate)
    const rangeLabel = params.rangeLabel ?? `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`

    if (start > end) return { success: false, error: 'Start date must be before end date' }

    const summary = await getDelayedPatientsSummary(start, end, params.shiftId ?? null)
    const csv = generateDelayedPatientsCSV(summary, rangeLabel)

    logger.info('Exported delayed patients CSV', {
      userId: session.userId,
      total: summary.totalPatients,
      delayed: summary.delayedPatients,
      rangeLabel,
    })

    return { success: true, data: csv }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export delayed patients data'
    logger.error('exportDelayedPatientsCSV failed', error as Error)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// US-10.4 — Bed-Wise Performance CSV
// ---------------------------------------------------------------------------

export async function exportBedPerformanceCSV(params: {
  startDate: Date | string
  endDate: Date | string
  shiftId?: string | null
  rangeLabel?: string
}): Promise<CsvExportResult> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const start = parseDate(params.startDate)
    const end = parseDate(params.endDate)
    const rangeLabel = params.rangeLabel ?? `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`

    if (start > end) return { success: false, error: 'Start date must be before end date' }

    const report = await getBedPerformanceReport(start, end, params.shiftId ?? null)
    const csv = generateBedPerformanceCSV(report, rangeLabel)

    logger.info('Exported bed performance CSV', {
      userId: session.userId,
      beds: report.rows.length,
      rangeLabel,
    })

    return { success: true, data: csv }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export bed performance data'
    logger.error('exportBedPerformanceCSV failed', error as Error)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// US-10.5 — Stage-Wise Delays CSV
// ---------------------------------------------------------------------------

export async function exportStageDelayCSV(params: {
  startDate?: Date | string | null
  endDate?: Date | string | null
  rangeLabel?: string
}): Promise<CsvExportResult> {
  try {
    const session = await requireRole(['supervisor', 'admin', 'auditor'])

    const start = params.startDate ? parseDate(params.startDate) : undefined
    const end = params.endDate ? parseDate(params.endDate) : undefined
    const rangeLabel =
      params.rangeLabel ??
      (start && end
        ? `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`
        : 'All Time')

    if (start && end && start > end) {
      return { success: false, error: 'Start date must be before end date' }
    }

    const report = await getStageDelayReport(start, end)
    const csv = generateStageDelayCSV(report, rangeLabel)

    logger.info('Exported stage delay CSV', {
      userId: session.userId,
      stages: report.rows.length,
      rangeLabel,
    })

    return { success: true, data: csv }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export stage delay data'
    logger.error('exportStageDelayCSV failed', error as Error)
    return { success: false, error: message }
  }
}
