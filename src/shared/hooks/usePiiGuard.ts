'use client'
/**
 * usePiiGuard — React hook for real-time PII detection in textareas (US-17.6)
 *
 * Usage:
 *   const { piiResult, hasPii, warningLabels } = usePiiGuard(value, { debounceMs: 300 })
 *
 * - Debounces calls to detectPii so it does not run on every keystroke.
 * - Returns the detection result, a boolean flag, and a human-readable label string.
 * - Accepts an optional `whitelist` of categories to skip (admin-configured).
 */

import { useState, useEffect, useRef } from 'react'
import { detectPii, getPiiWarningLabels } from '@/shared/lib/pii-detector'
import type { PiiDetectionResult, PiiCategory } from '@/shared/lib/pii-detector'

interface UsePiiGuardOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number
  /** PII categories to skip (from system_settings whitelist) */
  whitelist?: PiiCategory[]
  /** Set to false to disable detection entirely (e.g. in read-only mode) */
  enabled?: boolean
}

interface UsePiiGuardReturn {
  /** Full detection result with all matches */
  piiResult: PiiDetectionResult | null
  /** True when at least one PII pattern was detected */
  hasPii: boolean
  /** Human-readable comma-separated labels, e.g. "Phone number, Email address" */
  warningLabels: string
}

const EMPTY_RESULT: PiiDetectionResult = { hasPii: false, matches: [], summary: '' }

export function usePiiGuard(
  value: string,
  options: UsePiiGuardOptions = {}
): UsePiiGuardReturn {
  const { debounceMs = 300, whitelist = [], enabled = true } = options
  const [piiResult, setPiiResult] = useState<PiiDetectionResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) {
      setPiiResult(null)
      return
    }

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Debounce: wait debounceMs before running detection
    timerRef.current = setTimeout(() => {
      const result = detectPii(value, whitelist)
      setPiiResult(result)
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, debounceMs, whitelist.join(',')])

  const effectiveResult = piiResult ?? EMPTY_RESULT

  return {
    piiResult: effectiveResult,
    hasPii: effectiveResult.hasPii,
    warningLabels: getPiiWarningLabels(effectiveResult.matches),
  }
}
