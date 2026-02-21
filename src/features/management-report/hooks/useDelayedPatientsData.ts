// useDelayedPatientsData — Data hook for DelayedPatientPercentageView (US-10.3)
// Epic 10: Management Report Dashboard

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchDelayedPatientsSummary } from '../actions/delayed-patients-actions'
import type { DelayedPatientsSummary, DateRangePreset } from '../types/report.types'

const POLL_INTERVAL_MS = 60_000

export const PRESETS: { label: string; value: DateRangePreset; hours: number }[] = [
  { label: '24h', value: '24h', hours: 24 },
  { label: '7d',  value: '7d',  hours: 24 * 7 },
  { label: '30d', value: '30d', hours: 24 * 30 },
]

export interface DelayedPatientsData {
  preset: DateRangePreset
  setPreset: (p: DateRangePreset) => void
  selectedShiftId: string
  setSelectedShiftId: (id: string) => void
  selectedPreset: (typeof PRESETS)[number]
  summary: DelayedPatientsSummary | null
  loading: boolean
  error: string | null
  lastRefreshed: Date | null
  reload: () => void
}

export function useDelayedPatientsData(): DelayedPatientsData {
  const [preset, setPreset] = useState<DateRangePreset>('7d')
  const [selectedShiftId, setSelectedShiftId] = useState<string>('all')
  const [summary, setSummary] = useState<DelayedPatientsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedPreset = PRESETS.find((p) => p.value === preset) ?? PRESETS[0]

  const load = useCallback(async () => {
    setError(null)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - selectedPreset.hours * 3_600_000)
    const result = await fetchDelayedPatientsSummary({
      startDate,
      endDate,
      shiftId: selectedShiftId === 'all' ? null : selectedShiftId,
    })
    if (result.success && result.data) {
      setSummary(result.data)
      setLastRefreshed(new Date())
    } else {
      setError(result.error ?? 'Failed to load delayed patients data')
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

  return {
    preset, setPreset,
    selectedShiftId, setSelectedShiftId,
    selectedPreset,
    summary, loading, error, lastRefreshed,
    reload: () => { setLoading(true); void load() },
  }
}
