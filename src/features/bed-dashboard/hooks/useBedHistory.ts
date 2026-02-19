/**
 * useBedHistory.ts
 * 
 * Custom hook for managing the state and interactions of the Bed History feature.
 * 
 * Responsibilities:
 * - Fetching historical log data for a specific bed
 * - Managing loading, error, and open/closed states for the history modal
 * - Caching/storing history data (temporarily in state)
 * - Handling refreshes after corrections
 * 
 * Technical Implementation:
 * Uses a reducer pattern to manage complex state transitions (loading -> success/error)
 * to avoid race conditions and ensure consistent UI state.
 */

import { useReducer, useCallback, useEffect } from 'react'
import type { BedHistoryLog } from '../lib/bed-queries'
import { getBedHistory } from '../actions/bed-actions'

// --- Types ---

interface BedHistoryState {
    isOpen: boolean
    isLoading: boolean
    history: BedHistoryLog[]
    selectedBedId: string | null
    selectedBedNumber: string | null
    error: string | null
    lastUpdated: number | null
}

type BedHistoryAction =
    | { type: 'OPEN_HISTORY'; payload: { bedId: string; bedNumber: string } }
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: { data: BedHistoryLog[] } }
    | { type: 'FETCH_ERROR'; payload: { error: string } }
    | { type: 'CLOSE_HISTORY' }
    | { type: 'RESET_ERROR' }

// --- Reducer ---

const initialState: BedHistoryState = {
    isOpen: false,
    isLoading: false,
    history: [],
    selectedBedId: null,
    selectedBedNumber: null,
    error: null,
    lastUpdated: null
}

function bedHistoryReducer(state: BedHistoryState, action: BedHistoryAction): BedHistoryState {
    switch (action.type) {
        case 'OPEN_HISTORY':
            return {
                ...state,
                isOpen: true,
                selectedBedId: action.payload.bedId,
                selectedBedNumber: action.payload.bedNumber,
                // Reset data on new open to show loading state cleanly
                history: [],
                error: null,
                isLoading: true // Start loading immediately
            }
        case 'FETCH_START':
            return {
                ...state,
                isLoading: true,
                error: null
            }
        case 'FETCH_SUCCESS':
            return {
                ...state,
                isLoading: false,
                history: action.payload.data,
                lastUpdated: Date.now(),
                error: null
            }
        case 'FETCH_ERROR':
            return {
                ...state,
                isLoading: false,
                error: action.payload.error,
                // Keep old history if available? No, safer to clear if fetch failed
                history: []
            }
        case 'CLOSE_HISTORY':
            return {
                ...initialState
            }
        case 'RESET_ERROR':
            return {
                ...state,
                error: null
            }
        default:
            return state
    }
}

// --- Hook ---

/**
 * Hook to access and manipulate bed history data.
 * @returns Object containing state and action handlers
 */
export function useBedHistory() {
    const [state, dispatch] = useReducer(bedHistoryReducer, initialState)

    /**
     * Data fetching logic encapsulated in a helper
     * This avoids duplication between initial load and refresh
     */
    const loadData = useCallback(async (bedId: string) => {
        dispatch({ type: 'FETCH_START' })
        try {
            const result = await getBedHistory(bedId)

            if (result.success && result.data) {
                dispatch({
                    type: 'FETCH_SUCCESS',
                    payload: { data: result.data }
                })
            } else {
                dispatch({
                    type: 'FETCH_ERROR',
                    payload: { error: result.error || 'Failed to load history' }
                })
            }
        } catch (err) {
            console.error('BedHistory fetch error:', err)
            dispatch({
                type: 'FETCH_ERROR',
                payload: { error: 'An unexpected network error occurred.' }
            })
        }
    }, [])

    /**
     * Opens the history modal for a specific bed and triggers data fetch
     */
    const fetchHistory = useCallback((bedId: string, bedNumber: string) => {
        // Only trigger if we are opening a different bed or it was closed
        // This check prevents unnecessary re-renders if called redundantly
        if (state.selectedBedId !== bedId || !state.isOpen) {
            dispatch({
                type: 'OPEN_HISTORY',
                payload: { bedId, bedNumber }
            })
            // Trigger the async fetch
            loadData(bedId)
        }
    }, [state.selectedBedId, state.isOpen, loadData])

    /**
     * Refreshes the data for the currently selected bed
     * Useful after a correction is made
     */
    const refreshHistory = useCallback(() => {
        if (state.selectedBedId) {
            loadData(state.selectedBedId)
        }
    }, [state.selectedBedId, loadData])

    /**
     * Closes the modal and resets state
     */
    const closeHistory = useCallback(() => {
        dispatch({ type: 'CLOSE_HISTORY' })
    }, [])

    // Debug logging for development
    useEffect(() => {
        if (state.error) {
            console.warn(`[useBedHistory] Error: ${state.error}`)
            // Potential toast integration here if desired
        }
    }, [state.error])

    return {
        // State Properties
        isOpen: state.isOpen,
        isLoading: state.isLoading,
        history: state.history,
        selectedBedId: state.selectedBedId,
        selectedBedNumber: state.selectedBedNumber,
        error: state.error,
        lastUpdated: state.lastUpdated,

        // Actions
        fetchHistory,
        closeHistory,
        refreshHistory
    }
}
