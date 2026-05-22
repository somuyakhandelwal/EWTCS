'use server'

import { requireRole } from '@/shared/lib/auth'
import { logger } from '@/shared/config/logger'
import {
  getErTatSummary,
  getErTatRecords,
  getErCleaningTatSummary,
  getErCleaningTatRecords,
  getTriageTatSummary,
  getTriageTatRecords,
  getTriageCleaningTatSummary,
  getTriageCleaningTatRecords,
  type DurationMetricSummary,
  type WorkflowTatRecord,
} from '../lib/stage-analytics'

export interface FetchWorkflowTatSummaryResult {
  success: boolean
  data?: DurationMetricSummary
  error?: string
}

export interface FetchWorkflowTatRecordsResult {
  success: boolean
  data?: WorkflowTatRecord[]
  error?: string
}

async function withTatAccess<T>(
  label: string,
  load: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    await requireRole(['supervisor', 'admin', 'auditor'])
    return { success: true, data: await load() }
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to fetch ${label}`
    logger.error(`${label} failed`, error as Error)
    return { success: false, error: message }
  }
}

function limitRecords(records: WorkflowTatRecord[], limit?: number): WorkflowTatRecord[] {
  return limit ? records.slice(0, limit) : records
}

export async function fetchErTatSummary(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<FetchWorkflowTatSummaryResult> {
  return withTatAccess('fetchErTatSummary', () =>
    getErTatSummary(options?.startDate, options?.endDate)
  )
}

export async function fetchErTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<FetchWorkflowTatRecordsResult> {
  return withTatAccess('fetchErTatRecords', async () =>
    limitRecords(await getErTatRecords(options?.startDate, options?.endDate), options?.limit)
  )
}

export async function fetchErCleaningTatSummary(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<FetchWorkflowTatSummaryResult> {
  return withTatAccess('fetchErCleaningTatSummary', () =>
    getErCleaningTatSummary(options?.startDate, options?.endDate)
  )
}

export async function fetchErCleaningTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<FetchWorkflowTatRecordsResult> {
  return withTatAccess('fetchErCleaningTatRecords', async () =>
    limitRecords(await getErCleaningTatRecords(options?.startDate, options?.endDate), options?.limit)
  )
}

export async function fetchTriageTatSummary(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<FetchWorkflowTatSummaryResult> {
  return withTatAccess('fetchTriageTatSummary', () =>
    getTriageTatSummary(options?.startDate, options?.endDate)
  )
}

export async function fetchTriageTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<FetchWorkflowTatRecordsResult> {
  return withTatAccess('fetchTriageTatRecords', async () =>
    limitRecords(await getTriageTatRecords(options?.startDate, options?.endDate), options?.limit)
  )
}

export async function fetchTriageCleaningTatSummary(options?: {
  startDate?: Date
  endDate?: Date
}): Promise<FetchWorkflowTatSummaryResult> {
  return withTatAccess('fetchTriageCleaningTatSummary', () =>
    getTriageCleaningTatSummary(options?.startDate, options?.endDate)
  )
}

export async function fetchTriageCleaningTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}): Promise<FetchWorkflowTatRecordsResult> {
  return withTatAccess('fetchTriageCleaningTatRecords', async () =>
    limitRecords(
      await getTriageCleaningTatRecords(options?.startDate, options?.endDate),
      options?.limit
    )
  )
}
