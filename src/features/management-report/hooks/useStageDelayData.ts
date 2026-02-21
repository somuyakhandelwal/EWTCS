// useStageDelayData — Data hook for StageDelayView (US-10.5)
// Epic 10: Management Report Dashboard

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchStageDelayReport } from '../actions/stage-delay-actions'
import type { StageDelayReport, DateRangePreset } from '../types/report.types'

const POLL_INTERVAL_MS = 120_000 // 2 min — stage data changes less frequently

export const PRESETS: { label: string; value: DateRangePreset; hours: number }[] = [
  { label: '24h', value: '24h', hours: 24 },
  { label: '7d',  value: '7d',  hours: 24 * 7 },
  { label: '30d', value: '30d', hours: 24 * 30 },
]

export interface StageDelayData {
  preset: DateRangePreset
  setPreset: (p: DateRangePreset) => void
  selectedPreset: (typeof PRESETS)[number]
  report: StageDelayReport | null
  loading: boolean
  error: string | null
  lastRefreshed: Date | null
  reload: () => void
}

export function useStageDelayData(): StageDelayData {
  const [preset, setPreset] = useState<DateRangePreset>('7d')
  const [report, setReport] = useState<StageDelayReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedPreset = PRESETS.find((p) => p.value === preset) ?? PRESETS[0]

  const load = useCallback(async () => {
    setError(null)
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - selectedPreset.hours * 3_600_000)
    const result = await fetchStageDelayReport({ startDate, endDate })
    if (result.success && result.data) {
      setReport(result.data)
      setLastRefreshed(new Date())
    } else {
      setError(result.error ?? 'Failed to load stage delay data')
    }
    setLoading(false)
  }, [selectedPreset.hours])

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
    selectedPreset,
    report, loading, error, lastRefreshed,
    reload: () => { setLoading(true); void load() },
  }
}
