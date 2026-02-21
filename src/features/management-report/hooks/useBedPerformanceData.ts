// useBedPerformanceData — Data hook for BedPerformanceView (US-10.4)
// Epic 10: Management Report Dashboard

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchBedPerformanceReport } from '../actions/bed-performance-actions'
import type { BedPerformanceReport, DateRangePreset } from '../types/report.types'

const POLL_INTERVAL_MS = 60_000

export const PRESETS: { label: string; value: DateRangePreset; hours: number }[] = [
  { label: '24h', value: '24h', hours: 24 },
  { label: '7d', value: '7d',  hours: 24 * 7 },
  { label: '30d', value: '30d', hours: 24 * 30 },
]

export type SortField =
  | 'bedNumber'
  | 'patientsTreated'
  | 'avgDurationMs'
  | 'delayRate'
export type SortDir = 'asc' | 'desc'

export interface BedPerformanceData {
  preset: DateRangePreset
  setPreset: (p: DateRangePreset) => void
  selectedShiftId: string
  setSelectedShiftId: (id: string) => void
  selectedPreset: (typeof PRESETS)[number]
  report: BedPerformanceReport | null
  loading: boolean
  error: string | null
  lastRefreshed: Date | null
  sortField: SortField
  sortDir: SortDir
  setSort: (field: SortField) => void
  reload: () => void
}

export function useBedPerformanceData(): BedPerformanceData {
  const [preset, setPreset] = useState<DateRangePreset>('7d')
  const [selectedShiftId, setSelectedShiftId] = useState<string>('all')
  const [report, setReport] = useState<BedPerformanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [sortField, setSortField] = useState<SortField>('bedNumber')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedPreset = PRESETS.find((p) => p.value === preset) ?? PRESETS[0]

  const load = useCallback(async () => {
    setError(null)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - selectedPreset.hours * 3_600_000)
    const result = await fetchBedPerformanceReport({
      startDate,
      endDate,
      shiftId: selectedShiftId === 'all' ? null : selectedShiftId,
    })
    if (result.success && result.data) {
      setReport(result.data)
      setLastRefreshed(new Date())
    } else {
      setError(result.error ?? 'Failed to load bed performance data')
    }
    setLoading(false)
  }, [selectedPreset.hours, selectedShiftId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => { void load() }, POLL_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  const setSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir(field === 'bedNumber' ? 'asc' : 'desc')
      }
    },
    [sortField]
  )

  return {
    preset, setPreset,
    selectedShiftId, setSelectedShiftId,
    selectedPreset,
    report, loading, error, lastRefreshed,
    sortField, sortDir, setSort,
    reload: () => { setLoading(true); void load() },
  }
}
