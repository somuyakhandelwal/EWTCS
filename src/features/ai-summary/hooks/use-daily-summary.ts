'use client'

// Hook — EPIC 9: Daily AI Summary
// Provides state and actions for fetching and triggering daily summaries.

import { useState, useEffect, useCallback } from 'react'
import type { DailySummary } from '../types/daily-summary'

interface UseDailySummaryState {
    summaries: DailySummary[]
    loading: boolean
    triggering: boolean
    error: string | null
    triggerSuccess: boolean
}

interface UseDailySummaryReturn extends UseDailySummaryState {
    reload: () => void
    trigger: (date?: string) => Promise<void>
}

export function useDailySummary(limit = 30): UseDailySummaryReturn {
    const [state, setState] = useState<UseDailySummaryState>({
        summaries: [],
        loading: true,
        triggering: false,
        error: null,
        triggerSuccess: false,
    })

    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true, error: null }))
        try {
            const res = await fetch(`/api/daily-summary/generate?limit=${limit}`)
            const json = await res.json()
            if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to load summaries')
            setState(s => ({ ...s, summaries: json.summaries ?? [], loading: false }))
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            setState(s => ({ ...s, loading: false, error: message }))
        }
    }, [limit])

    useEffect(() => {
        load()
    }, [load])

    const trigger = useCallback(async (date?: string) => {
        setState(s => ({ ...s, triggering: true, error: null, triggerSuccess: false }))
        try {
            const body = date ? JSON.stringify({ date }) : undefined
            const res = await fetch('/api/daily-summary/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            })
            const json = await res.json()
            if (!res.ok || !json.success) throw new Error(json.error ?? 'Aggregation failed')
            setState(s => ({ ...s, triggering: false, triggerSuccess: true }))
            // Refresh summaries list after a successful trigger
            await load()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            setState(s => ({ ...s, triggering: false, error: message, triggerSuccess: false }))
        }
    }, [load])

    return { ...state, reload: load, trigger }
}
