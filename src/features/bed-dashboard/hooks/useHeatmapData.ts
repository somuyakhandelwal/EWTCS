// useHeatmapData — custom hook for the staffing heatmap
// EPIC 10: Management Report Dashboard
// Manages data loading, date range filters, and drill-down state.

import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchHeatmapData, fetchHeatmapCellDetail } from '../actions/heatmap-actions'
import type {
  HeatmapData,
  HeatmapDrillDownRecord,
  HeatmapFilters,
} from '../types/heatmap.types'
import { logger } from '@/shared/config/logger'

export interface DrillDownState {
  records:    HeatmapDrillDownRecord[]
  loading:    boolean
  dayOfWeek:  number | null
  hourOfDay:  number | null
}

export interface HeatmapState {
  data:          HeatmapData | null
  loading:       boolean
  error:         string | null
  filters:       HeatmapFilters
  setFilters:    (f: HeatmapFilters) => void
  drillDown:     DrillDownState
  openDrillDown: (dow: number, hour: number) => void
  closeDrillDown: () => void
  reload:        () => void
}

export function useHeatmapData(): HeatmapState {
  const [data,    setData]    = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [filters, setFilters] = useState<HeatmapFilters>({})

  // Drill-down state
  const [drillRecords, setDrillRecords] = useState<HeatmapDrillDownRecord[]>([])
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillDow,     setDrillDow]     = useState<number | null>(null)
  const [drillHour,    setDrillHour]    = useState<number | null>(null)

  // Bug fix: race condition guard — stale responses from superseded requests are
  // discarded so rapidly-changed filters never overwrite newer data with older results.
  const requestIdRef = useRef(0)

  const reload = useCallback(async () => {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetchHeatmapData(filters)
      if (reqId !== requestIdRef.current) return  // stale response — discard
      if (!result.success) throw new Error(result.error)
      setData(result.data ?? null)
    } catch (err) {
      if (reqId !== requestIdRef.current) return  // stale response — discard
      const message = err instanceof Error ? err.message : 'Failed to load heatmap'
      setError(message)
      logger.error('Failed to load staffing heatmap', err as Error)
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }, [filters])

  const openDrillDown = useCallback(async (dow: number, hour: number) => {
    setDrillDow(dow)
    setDrillHour(hour)
    setDrillRecords([])
    setDrillLoading(true)
    try {
      const result = await fetchHeatmapCellDetail(dow, hour, filters)
      setDrillRecords(result.success ? (result.data ?? []) : [])
    } catch (err) {
      logger.error('Failed to load heatmap drill-down', err as Error)
      setDrillRecords([])
    } finally {
      setDrillLoading(false)
    }
  }, [filters])

  const closeDrillDown = useCallback(() => {
    setDrillDow(null)
    setDrillHour(null)
    setDrillRecords([])
  }, [])

  useEffect(() => { void reload() }, [reload])

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    drillDown: {
      records:   drillRecords,
      loading:   drillLoading,
      dayOfWeek: drillDow,
      hourOfDay: drillHour,
    },
    openDrillDown,
    closeDrillDown,
    reload,
  }
}
