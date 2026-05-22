'use server'

import { markBedClean as markClean } from './bed-cleaning-actions'
import {
  fetchTATRecords as fetchLegacyTATRecords,
  fetchTATSummary as fetchLegacyTATSummary,
  fetchTatRecords as fetchLegacyTatRecords,
  fetchTatSummary as fetchLegacyTatSummary,
} from './legacy-tat-actions'
import {
  fetchErCleaningTatRecords as fetchErCleaningRecords,
  fetchErCleaningTatSummary as fetchErCleaningSummary,
  fetchErTatRecords as fetchErRecords,
  fetchErTatSummary as fetchErSummary,
  fetchTriageCleaningTatRecords as fetchTriageCleaningRecords,
  fetchTriageCleaningTatSummary as fetchTriageCleaningSummary,
  fetchTriageTatRecords as fetchTriageRecords,
  fetchTriageTatSummary as fetchTriageSummary,
} from './workflow-tat-actions'

export async function fetchTATSummary(options?: { startDate?: Date; endDate?: Date }) {
  return fetchLegacyTATSummary(options)
}

export async function fetchTATRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return fetchLegacyTATRecords(options)
}

export async function fetchTatSummary(hoursBack: number = 24) {
  return fetchLegacyTatSummary(hoursBack)
}

export async function fetchTatRecords(hoursBack: number = 24) {
  return fetchLegacyTatRecords(hoursBack)
}

export async function fetchErTatSummary(options?: { startDate?: Date; endDate?: Date }) {
  return fetchErSummary(options)
}

export async function fetchErTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return fetchErRecords(options)
}

export async function fetchErCleaningTatSummary(options?: { startDate?: Date; endDate?: Date }) {
  return fetchErCleaningSummary(options)
}

export async function fetchErCleaningTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return fetchErCleaningRecords(options)
}

export async function fetchTriageTatSummary(options?: { startDate?: Date; endDate?: Date }) {
  return fetchTriageSummary(options)
}

export async function fetchTriageTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return fetchTriageRecords(options)
}

export async function fetchTriageCleaningTatSummary(options?: { startDate?: Date; endDate?: Date }) {
  return fetchTriageCleaningSummary(options)
}

export async function fetchTriageCleaningTatRecords(options?: {
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  return fetchTriageCleaningRecords(options)
}

export async function markBedClean(bedId: string) {
  return markClean(bedId)
}
