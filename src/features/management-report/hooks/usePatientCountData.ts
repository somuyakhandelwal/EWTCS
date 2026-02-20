// usePatientCountData — Data-loading hook for PatientCountView (US-10.1)
// Epic 10: Management Report Dashboard
//
// Encapsulates fetch logic, polling, and filter state so PatientCountView
// stays under the 200-line limit.

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchPatientCountSummary } from '../actions/patient-count-actions'
import type { PatientCountSummary, DateRangePreset } from '../types/report.types'

const POLL_INTERVAL_MS = 60_000

export const PRESETS: { label: string; value: DateRangePreset; hours: number }[] = [
  { label: '24h', value: '24h', hours: 24 },
  { label: '7d',  value: '7d',  hours: 24 * 7 },
  { label: '30d', value: '30d', hours: 24 * 30 },
]

export interface PatientCountData {
  preset: DateRangePreset
  setPreset: (p: DateRangePreset) => void
  selectedShiftId: string
  setSelectedShiftId: (id: string) => void
  selectedPreset: typeof PRESETS[number]
  summary: PatientCountSummary | null
  loading: boolean
  error: string | null
  lastRefreshed: Date | null
  reload: () => void
}

export function usePatientCountData(): PatientCountData {
  const [preset, setPreset] = useState<DateRangePreset>('24h')
  const [selectedShiftId, setSelectedShiftId] = useState<string>('all')
  const [summary, setSummary] = useState<PatientCountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedPreset = PRESETS.find(p => p.value === preset) ?? PRESETS[0]

  const load = useCallback(async () => {
    setError(null)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - selectedPreset.hours * 3_600_000)
    const result = await fetchPatientCountSummary({
      startDate,
      endDate,
      shiftId: selectedShiftId === 'all' ? null : selectedShiftId,
    })
    if (result.success && result.data) {
      setSummary(result.data)
      setLastRefreshed(new Date())
    } else {
      setError(result.error ?? 'Failed to load patient count')
    }
    setLoading(false)
  }, [selectedPreset.hours, selectedShiftId])

  // Initial load + reload when filters change
  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  // Real-time polling (AC: "Count is updated in real-time")
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => { void load() }, POLL_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load])

  return {
    preset, setPreset,
    selectedShiftId, setSelectedShiftId,
    selectedPreset,
    summary, loading, error, lastRefreshed,
    reload: () => { setLoading(true); void load() },
  }
}
