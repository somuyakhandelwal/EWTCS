// Bed Status Legend Component
// Epic 1: Nurse Desk Bed Dashboard
// US-4.4: Display Color Legend with collapsible and accessibility features

'use client'

import { memo, useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Stage } from '../types/bed'
import { getStageColorClasses } from '../lib/utils'
import { cn } from '@/shared/lib/utils'

interface BedStatusLegendProps {
  stages: Stage[]
}

const LEGEND_STORAGE_KEY = 'bed-status-legend-collapsed'

export const BedStatusLegend = memo(function BedStatusLegend({ stages }: BedStatusLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return
    
    try {
      const savedState = localStorage.getItem(LEGEND_STORAGE_KEY)
      if (savedState !== null) {
        // Safely parse boolean value
        try {
          const isCollapsedValue = JSON.parse(savedState)
          if (typeof isCollapsedValue === 'boolean') {
            setIsCollapsed(isCollapsedValue)
          }
        } catch {
          // If parsing fails, fall back to string comparison
          setIsCollapsed(savedState === 'true')
        }
      }
    } catch (error) {
      // Silently fail if localStorage is not available (e.g., private browsing mode)
      console.warn('Failed to load legend state from localStorage:', error)
    }
  }, [])

  // Save collapsed state to localStorage when it changes
  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const newState = !prev
      // Check if we're in a browser environment and localStorage is available
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LEGEND_STORAGE_KEY, String(newState))
        } catch (error) {
          // Silently fail if localStorage is not available
          console.warn('Failed to save legend state to localStorage:', error)
        }
      }
      return newState
    })
  }

  return (
    <div 
      className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4"
      role="region"
      aria-label="Color legend for bed stages and status"
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between mb-3">
        <h3 
          id="legend-title"
          className="text-sm font-semibold text-zinc-300"
        >
          Stage Legend
        </h3>
        <button
          onClick={handleToggle}
          aria-expanded={!isCollapsed}
          aria-controls="legend-content"
          aria-label={isCollapsed ? 'Expand legend' : 'Collapse legend'}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded px-3 py-2 min-h-[44px] min-w-[44px]"
        >
          {isCollapsed ? (
            <>
              <span>Show</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              <span>Hide</span>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div 
          id="legend-content"
          aria-labelledby="legend-title"
        >
          {/* Stage colors */}
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2"
            role="list"
            aria-label="Stage color indicators"
          >
            {stages.map((stage) => {
              const colorClasses = getStageColorClasses(stage.colorCode)
              return (
                <div
                  key={stage.id}
                  role="listitem"
                  className="flex items-center gap-2 group cursor-help"
                  title={stage.description || stage.name}
                  aria-label={`${stage.name} stage: ${stage.colorCode} color${stage.description ? `, ${stage.description}` : ''}`}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border-2',
                      colorClasses.bg,
                      colorClasses.border
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    {stage.name}
                  </span>
                </div>
              )
            })}
          </div>
          
          {/* Delay indicator */}
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div 
              className="flex items-center gap-2"
              role="listitem"
              aria-label="Delayed status: Red color with pulsing animation, indicates patient has been in current stage for more than 3 hours"
            >
              <div 
                className="w-4 h-4 rounded border-2 border-red-700 bg-red-900/50 animate-pulse" 
                aria-hidden="true"
              />
              <span className="text-xs text-zinc-400">
                Delayed (&gt;3 hours)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})


