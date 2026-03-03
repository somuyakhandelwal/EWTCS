/**
 * React hook for security scanning
 * EPIC 17: Security & Privacy
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SecurityScan, ScanReport } from '../types/scan'
import { processScanReport, getRecentScans, getScanByDate } from '../actions/scan-actions'

interface UseScanState {
  report: ScanReport | null
  loading: boolean
  error: string | null
}

interface UseScanReturn extends UseScanState {
  processScan: (reportJson: string, scanDate?: string) => Promise<void>
  reload: () => void
}

/**
 * Hook to process and manage security scan reports
 */
export function useScanReport(): UseScanReturn {
  const [report, setReport] = useState<ScanReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processScan = useCallback(
    async (reportJson: string, scanDate?: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await processScanReport({ reportJson, scanDate })
        if (result.success && result.report) {
          setReport(result.report)
        } else {
          setError(result.error || 'Failed to process scan')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reload = useCallback(() => {
    setReport(null)
    setError(null)
  }, [])

  return { report, loading, error, processScan, reload }
}

interface UseRecentScansState {
  scans: unknown[]
  loading: boolean
  error: string | null
}

/**
 * Hook to fetch recent scan reports
 */
export function useRecentScans(limit: number = 30): UseRecentScansState {
  const [scans, setScans] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const result = await getRecentScans(limit)
        if (result.success && result.scans) {
          setScans(result.scans)
        } else {
          setError(result.error || 'Failed to fetch scans')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [limit])

  return { scans, loading, error }
}

/**
 * Hook to fetch a specific scan by date
 */
export function useScanByDate(scanDate: string) {
  const [scan, setScan] = useState<SecurityScan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const result = await getScanByDate(scanDate)
        if (result.success && result.scan) {
          setScan(result.scan)
        } else {
          setError(result.error || 'Failed to fetch scan')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchScan()
  }, [scanDate])

  return { scan, loading, error }
}
